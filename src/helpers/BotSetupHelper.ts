import ButtonHelper from "./ButtonHelper"
import fs from "fs"
import MessageHelper from "./MessageHelper"
import path from "path"
import SelectMenuHelper from "./SelectMenuHelper"
import SlashBuilder from "../builders/SlashBuilder"
import SlashHelper from "./SlashHelper"
import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	Emoji,
	iBaseBotCache,
	iBaseGuildCache,
	iButtonFile,
	iEventFile,
	iMessageFile,
	iSelectMenuFile,
	iSlashFile,
	iSlashFolder,
	iSlashSubFile,
	NovaOptions,
	ResponseBuilder
} from ".."
import {
	ButtonInteraction,
	Client,
	ClientEvents,
	Collection,
	CommandInteraction,
	Message,
	SelectMenuInteraction
} from "discord.js"
import { SlashCommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"

export default class BotSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public readonly botCache: BC
	public readonly slashFiles = new Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>()
	public readonly buttonFiles = new Collection<string, iButtonFile<E, GC>>()
	public readonly selectMenuFiles = new Collection<string, iSelectMenuFile<E, GC>>()
	public readonly messageFiles = new Collection<string, iMessageFile<E, GC>>()
	public readonly eventFiles: iEventFile<E, GC, BC, keyof ClientEvents>[] = []

	public constructor(
		private readonly GCClass: iBaseGuildCache<E, GC>,
		BCClass: iBaseBotCache<E, GC, BC>,
		public readonly options: NovaOptions<E, GC, BC>,
		private readonly bot: Client
	) {
		this.botCache = new BCClass(this.GCClass, this.bot, this.options.config)

		this.populateFiles()
		this.setupSlashs()
		this.setupButtons()
		this.setupSelectMenus()
		this.setupMessages()
		this.setupEvents()

		for (const event of this.eventFiles) {
			this.bot.on(event.name, (...args) => event.execute(this.botCache, ...args))
		}

		this.bot.on("messageCreate", async message => {
			if (message.author.bot) return
			if (!message.guild) return
			const cache = await this.botCache.getGuildCache(message.guild!)

			await this.onMessage(cache, message)
		})

		this.bot.on("interactionCreate", async interaction => {
			if (!interaction.guild) return
			const cache = await this.botCache.getGuildCache(interaction.guild!)

			if (interaction.isCommand()) await this.onSlashInteraction(cache, interaction)
			if (interaction.isButton()) await this.onButtonInteraction(cache, interaction)
			if (interaction.isSelectMenu()) await this.onSelectMenuInteraction(cache, interaction)
		})
	}

	/**
	 * Fill collections with default files
	 */
	private populateFiles() {
		this.slashFiles.set("help", require("../interactions/slashs/help")(this))
		this.buttonFiles.set("help-maximum", require("../interactions/buttons/help-maximum")(this))
		this.buttonFiles.set("help-minimum", require("../interactions/buttons/help-minimum")(this))
		this.selectMenuFiles.set(
			"help-item",
			require("../interactions/selectMenus/help-item")(this)
		)
		if (this.options.help.commandRegex) {
			this.messageFiles.set("help", require("../interactions/messages/help")(this))
		}
		this.eventFiles.push(require("../interactions/events/guildCreate")(this))
		this.eventFiles.push(require("../interactions/events/guildDelete")())
	}

	private isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private readEntities(name: string): string[] | null {
		const [err, files] = useTry(() => fs.readdirSync(path.join(this.options.directory, name)))

		if (err) return null

		return files
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.options.directory, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
		}
	}

	private setupSlashs() {
		const entityNames = this.readEntities("slashs")
		if (entityNames === null) return

		const messageCommands = this.readEntities("messages")
		const setAliasFile = messageCommands
			? messageCommands.length > 0
				? require("../interactions/slashs/set/alias")(messageCommands)
				: null
			: null

		// Slash subcommands
		const folderNames = entityNames.filter(f => !this.isFile(f))
		for (const folderName of folderNames) {
			const files = new Collection<string, iSlashSubFile<E, GC>>()
			const fileNames = this.readEntities(`slashs/${folderName}`)!
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			if (folderName === "set" && setAliasFile) {
				files.set("alias", setAliasFile)
				builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())
			}

			for (const fileName of fileNames) {
				const file = this.require<iSlashSubFile<E, GC>>(`slashs/${folderName}/${fileName}`)
				files.set(file.data.name, file)
				builder.addSubcommand(new SlashBuilder(file.data).buildSubcommand())
			}

			this.slashFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entityNames.filter(f => this.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iSlashFile<E, GC>>(`slashs/${filename}`)
			this.slashFiles.set(file.data.name, file)
		}

		if (!this.slashFiles.get("set") && setAliasFile) {
			const files = new Collection<string, iSlashSubFile<E, GC>>()
			const builder = new SlashCommandBuilder()
				.setName("set")
				.setDescription(`Commands for set`)

			files.set("alias", setAliasFile)
			builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())

			this.slashFiles.set("set", {
				data: builder,
				files
			})
		}
	}

	private setupButtons() {
		const fileNames = this.readEntities("buttons")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iButtonFile<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, file)
		}
	}

	private setupSelectMenus() {
		const fileNames = this.readEntities("selectMenus")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iSelectMenuFile<E, GC>>(`selectMenus/${fileName}`)
			this.selectMenuFiles.set(name, file)
		}
	}

	private setupMessages() {
		const fileNames = this.readEntities("messages")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<iMessageFile<E, GC>>(`messages/${fileName}`)
			this.messageFiles.set(fileName.split(".ts").at(0)!, file)
		}
	}

	private setupEvents() {
		const fileNames = this.readEntities("events")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<iEventFile<E, GC, BC, keyof ClientEvents>>(
				`events/${fileName}`
			)
			this.eventFiles.push(file)
		}
	}

	private async onMessage(cache: GC, message: Message) {
		const helper = new MessageHelper(cache, message)

		for (const [fileName, messageFile] of this.messageFiles) {
			if (messageFile.condition(helper)) {
				logger.discord(
					`Opening MessageCommand(${fileName}) for User(${message.author.tag})`
				)
				try {
					message
						.react("⌛")
						.catch(err => logger.warn("Failed to react (⌛) to message command", err))
					await messageFile.execute(helper)
				} catch (err) {
					logger.error("Error executing message command", err)
					helper.reactFailure()
					helper.respond(
						new ResponseBuilder(
							Emoji.BAD,
							"There was an error while executing this command!"
						)
					)
				}
				logger.discord(
					`Closing MessageCommand(${fileName}) for User(${message.author.tag})`
				)
				return
			}
		}
	}

	private async onSlashInteraction(cache: GC, interaction: CommandInteraction) {
		const slashEntity = this.slashFiles.get(interaction.commandName)
		if (!slashEntity) return
		logger.discord(
			`Opening SlashInteraction(${interaction.commandName}) for User(${interaction.user.tag})`
		)

		const subcommand = interaction.options.getSubcommand(false)
		const ephemeral = Object.keys(slashEntity).includes("ephemeral")
			? (slashEntity as iSlashFile<E, GC>).ephemeral
			: (slashEntity as iSlashFolder<E, GC>).files.get(subcommand!)!.ephemeral

		await interaction
			.deferReply({ ephemeral })
			.catch(err => logger.error("Failed to defer command interaction", err))

		const helper = new SlashHelper(cache, interaction)
		try {
			const slashFile =
				"files" in slashEntity ? slashEntity.files.get(subcommand!)! : slashEntity

			await slashFile.execute(helper)
			if (!slashFile.defer) {
				await interaction.deleteReply()
			}
		} catch (err) {
			logger.error("Error executing command interaction", err)
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
		logger.discord(
			`Closing SlashInteraction(${interaction.commandName}) for User(${interaction.user.tag})`
		)
	}

	private async onButtonInteraction(cache: GC, interaction: ButtonInteraction) {
		const buttonFile = this.buttonFiles.get(interaction.customId)
		if (!buttonFile) return
		logger.discord(
			`Opening ButtonInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)

		if (buttonFile.defer) {
			await interaction
				.deferReply({ ephemeral: buttonFile.ephemeral })
				.catch(err => logger.error("Failed to defer button interaction", err))
		}

		const helper = new ButtonHelper(cache, interaction)
		try {
			await buttonFile.execute(helper)
		} catch (err) {
			logger.error("Error executing button interaction", err)
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
		logger.discord(
			`Closing ButtonInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)
	}

	private async onSelectMenuInteraction(cache: GC, interaction: SelectMenuInteraction) {
		const selectMenuFile = this.selectMenuFiles.get(interaction.customId)
		if (!selectMenuFile) return
		logger.discord(
			`Opening SelectMenuInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)

		if (selectMenuFile.defer) {
			await interaction
				.deferReply({ ephemeral: selectMenuFile.ephemeral })
				.catch(err => logger.error("Failed to defer select menu interaction", err))
		}

		const helper = new SelectMenuHelper(cache, interaction)
		try {
			await selectMenuFile.execute(helper)
		} catch (err) {
			logger.error("Error executing select menu command", err)
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
		logger.discord(
			`Closing SelectMenuInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)
	}
}
