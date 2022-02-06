import ButtonHelper from "./ButtonHelper"
import fs from "fs"
import MessageHelper from "./MessageHelper"
import path from "path"
import SelectMenuHelper from "./SelectMenuHelper"
import SlashBuilder from "../builders/SlashBuilder"
import SlashHelper, { iSlashData } from "./SlashHelper"
import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	Emoji,
	HelpBuilder,
	iBaseBotCache,
	iBaseGuildCache,
	NovaOptions,
	ResponseBuilder,
	SlashCommandDeployer
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
	private readonly GCClass: iBaseGuildCache<E, GC>

	private readonly bot: Client
	public readonly options: NovaOptions<E, GC, BC>
	public readonly botCache: BC
	public readonly slashFiles: Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>
	public readonly buttonFiles: Collection<string, iButtonFile<E, GC>>
	public readonly selectMenuFiles: Collection<string, iSelectMenuFile<E, GC>>
	public readonly messageFiles: Collection<string, iMessageFile<E, GC>>
	public readonly eventFiles: iEventFile<E, GC, BC, keyof ClientEvents>[]

	constructor(
		GCClass: iBaseGuildCache<E, GC>,
		BCClass: iBaseBotCache<E, GC, BC>,
		options: NovaOptions<E, GC, BC>,
		bot: Client
	) {
		this.GCClass = GCClass

		this.options = options
		this.bot = bot
		this.botCache = new BCClass(this.GCClass, this.options.config, this.bot)
		this.slashFiles = new Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>()
		this.buttonFiles = new Collection<string, iButtonFile<E, GC>>()
		this.selectMenuFiles = new Collection<string, iSelectMenuFile<E, GC>>()
		this.messageFiles = new Collection<string, iMessageFile<E, GC>>()
		this.eventFiles = []

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

		this.bot.on("guildCreate", async guild => {
			logger.info(`Added to Guild(${guild.name})`)
			await this.botCache.registerGuildCache(guild.id)
			await new SlashCommandDeployer(guild.id, this.options.config, this.slashFiles).deploy()
		})

		this.bot.on("guildDelete", async guild => {
			logger.info(`Removed from Guild(${guild.name})`)
			await this.botCache.eraseGuildCache(guild.id)
			this.botCache.caches.delete(guild.id)
		})
	}

	private static isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private setupSlashs() {
		this.slashFiles.set("help", {
			defer: false,
			ephemeral: false,
			data: {
				name: "help",
				description: {
					slash: "Displays the help command",
					help: "Shows you the help menu that you are looking at right now"
				}
			},
			execute: async helper => {
				helper.interaction.channel?.send(
					new HelpBuilder(
						this.options.help.message(helper.cache),
						this.options.help.icon,
						this.options.directory
					).buildMinimum()
				)
			}
		})

		const [err, entityNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.directory, "slashs"))
		)

		if (err) return logger.error(`Failed to read slashs directory`, err)

		// Slash subcommands
		const folderNames = entityNames.filter(f => !BotSetupHelper.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.options.directory, `slashs/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iSlashSubFile<E, GC>> = new Collection()
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
		const fileNames = entityNames.filter(f => BotSetupHelper.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iSlashFile<E, GC>>(`slashs/${filename}`)
			this.slashFiles.set(file.data.name, file)
		}
	}

	private setupButtons() {
		this.buttonFiles.set("help-maximum", {
			defer: false,
			ephemeral: true,
			execute: async helper => {
				await helper.interaction.update(
					new HelpBuilder(
						this.options.help.message(helper.cache),
						this.options.help.icon,
						this.options.directory
					).buildMaximum()
				)
			}
		})
		this.buttonFiles.set("help-minimum", {
			defer: false,
			ephemeral: true,
			execute: async helper => {
				await helper.interaction.update(
					new HelpBuilder(
						this.options.help.message(helper.cache),
						this.options.help.icon,
						this.options.directory
					).buildMinimum()
				)
			}
		})

		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.directory, "buttons"))
		)

		if (err) return logger.error(`Failed to read buttons directory`, err)

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iButtonFile<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, file)
		}
	}

	private setupSelectMenus() {
		this.selectMenuFiles.set("help-item", {
			defer: false,
			ephemeral: true,
			execute: async helper => {
				helper.interaction.update(
					new HelpBuilder(
						this.options.help.message(helper.cache),
						this.options.help.icon,
						this.options.directory
					).buildCommand(helper.value()!)
				)
			}
		})

		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.directory, "selectMenus"))
		)

		if (err) return logger.error(`Failed to read selectMenus directory`, err)

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iSelectMenuFile<E, GC>>(`selectMenus/${fileName}`)
			this.selectMenuFiles.set(name, file)
		}
	}

	private setupMessages() {
		if (this.options.help.commandRegex) {
			this.messageFiles.set("help", {
				condition: helper => !!helper.match(this.options.help.commandRegex!),
				execute: async helper => {
					helper.respond(
						new HelpBuilder(
							this.options.help.message(helper.cache),
							this.options.help.icon,
							this.options.directory
						).buildMinimum()
					)
				}
			})
		}

		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.directory, "messages"))
		)

		if (err) return logger.error(`Failed to read messages directory`, err)

		for (const fileName of fileNames) {
			const file = this.require<iMessageFile<E, GC>>(`messages/${fileName}`)
			this.messageFiles.set(fileName.split(".ts").at(0)!, file)
		}
	}

	private setupEvents() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.options.directory, "events")))

		if (err) return logger.error(`Failed to read events directory`, err)

		for (const fileName of fileNames) {
			const file = this.require<iEventFile<E, GC, BC, keyof ClientEvents>>(
				`events/${fileName}`
			)
			this.eventFiles.push(file)
		}
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.options.directory, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
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

export interface iSlashFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	data: iSlashData
	execute: (helper: SlashHelper<E, GC>) => Promise<any>
}

export interface iSlashSubFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	data: iSlashData
	execute: (helper: SlashHelper<E, GC>) => Promise<any>
}

export interface iSlashFolder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	data: SlashCommandBuilder
	files: Collection<string, iSlashSubFile<E, GC>>
}

export interface iButtonFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: ButtonHelper<E, GC>) => Promise<any>
}

export interface iSelectMenuFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helpe3r: SelectMenuHelper<E, GC>) => Promise<any>
}

export interface iMessageFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	condition: (helper: MessageHelper<E, GC>) => boolean
	execute: (helper: MessageHelper<E, GC>) => Promise<void>
}

export interface iEventFile<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents
> {
	name: N
	execute: (botCache: BC, ...args: ClientEvents[N]) => Promise<any>
}
