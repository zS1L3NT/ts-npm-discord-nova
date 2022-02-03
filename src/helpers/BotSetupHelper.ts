import ButtonHelper from "./ButtonHelper"
import CommandBuilder from "../builders/CommandBuilder"
import fs from "fs"
import InteractionHelper, { iInteractionData } from "./InteractionHelper"
import MenuHelper from "./MenuHelper"
import MessageHelper from "./MessageHelper"
import path from "path"
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
	public readonly interactionFiles: Collection<
		string,
		iInteractionFile<E, GC> | iInteractionFolder<E, GC>
	>
	public readonly buttonFiles: Collection<string, iButtonFile<E, GC>>
	public readonly menuFiles: Collection<string, iMenuFile<E, GC>>
	public readonly messageFiles: iMessageFile<E, GC>[]
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
		this.messageFiles = []
		this.eventFiles = []
		this.interactionFiles = new Collection<
			string,
			iInteractionFile<E, GC> | iInteractionFolder<E, GC>
		>()
		this.buttonFiles = new Collection<string, iButtonFile<E, GC>>()
		this.menuFiles = new Collection<string, iMenuFile<E, GC>>()

		this.setupMessages()
		this.setupCommands()
		this.setupButtons()
		this.setupMenus()
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

			if (interaction.isCommand()) await this.onCommandInteraction(cache, interaction)
			if (interaction.isButton()) await this.onButtonInteraction(cache, interaction)
			if (interaction.isSelectMenu()) await this.onSelectMenuInteraction(cache, interaction)
		})

		this.bot.on("guildCreate", async guild => {
			logger.info(`Added to Guild(${guild.name})`)
			await this.botCache.registerGuildCache(guild.id)
			await new SlashCommandDeployer(
				guild.id,
				this.options.config,
				this.interactionFiles
			).deploy()
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

	private setupMessages() {
		if (this.options.help.commandRegex) {
			this.messageFiles.push({
				condition: helper => !!helper.match(this.options.help.commandRegex!),
				execute: async helper => {
					helper.respond(
						new HelpBuilder(
							this.options.help.message(helper.cache),
							this.options.help.icon,
							this.options.cwd
						).buildMinimum()
					)
				}
			})
		}

		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.cwd, "messages"))
		)

		if (err) return logger.error(`Failed to read messages directory`, err)

		for (const fileName of fileNames) {
			const file = this.require<iMessageFile<E, GC>>(`messages/${fileName}`)
			this.messageFiles.push(file)
		}
	}

	private setupCommands() {
		this.interactionFiles.set("help", {
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
						this.options.cwd
					).buildMinimum()
				)
			}
		})

		const [err, entityNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.cwd, "commands"))
		)

		if (err) return logger.error(`Failed to read commands directory`, err)

		// Slash subcommands
		const folderNames = entityNames.filter(f => !BotSetupHelper.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.options.cwd, `commands/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iInteractionSubcommandFile<E, GC>> = new Collection()
			for (const fileName of fileNames) {
				const file = this.require<iInteractionSubcommandFile<E, GC>>(
					`commands/${folderName}/${fileName}`
				)
				files.set(file.data.name, file)
				builder.addSubcommand(new CommandBuilder(file.data).buildSubcommand())
			}

			this.interactionFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entityNames.filter(f => BotSetupHelper.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iInteractionFile<E, GC>>(`commands/${filename}`)
			this.interactionFiles.set(file.data.name, file)
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
						this.options.cwd
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
						this.options.cwd
					).buildMinimum()
				)
			}
		})

		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.cwd, "buttons"))
		)

		if (err) return logger.error(`Failed to read buttons directory`, err)

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iButtonFile<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, file)
		}
	}

	private setupMenus() {
		this.menuFiles.set("help-item", {
			defer: false,
			ephemeral: true,
			execute: async helper => {
				helper.interaction.update(
					new HelpBuilder(
						this.options.help.message(helper.cache),
						this.options.help.icon,
						this.options.cwd
					).buildCommand(helper.value()!)
				)
			}
		})

		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.options.cwd, "menus")))

		if (err) return logger.error(`Failed to read menus directory`, err)

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iMenuFile<E, GC>>(`menus/${fileName}`)
			this.menuFiles.set(name, file)
		}
	}

	private setupEvents() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.options.cwd, "events")))

		if (err) return logger.error(`Failed to read events directory`, err)

		for (const fileName of fileNames) {
			const file = this.require<iEventFile<E, GC, BC, keyof ClientEvents>>(
				`events/${fileName}`
			)
			this.eventFiles.push(file)
		}
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.options.cwd, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
		}
	}

	private async onMessage(cache: GC, message: Message) {
		const helper = new MessageHelper(cache, message)
		try {
			for (const messageFile of this.messageFiles) {
				if (messageFile.condition(helper)) {
					message
						.react("⌛")
						.catch(err => logger.warn("Failed to react (⌛) to message command", err))
					await messageFile.execute(helper)
					break
				}
			}
		} catch (err) {
			logger.error("Error executing message command", err)
			helper.reactFailure()
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
	}

	private async onCommandInteraction(cache: GC, interaction: CommandInteraction) {
		const interactionEntity = this.interactionFiles.get(interaction.commandName)
		if (!interactionEntity) return

		const ephemeral = Object.keys(interactionEntity).includes("ephemeral")
			? (interactionEntity as iInteractionFile<E, GC>).ephemeral
			: (interactionEntity as iInteractionFolder<E, GC>).files.get(
					interaction.options.getSubcommand(true)
			  )!.ephemeral

		await interaction
			.deferReply({ ephemeral })
			.catch(err => logger.error("Failed to defer command interaction", err))

		const helper = new InteractionHelper(cache, interaction)
		try {
			const interactionFile = interactionEntity as iInteractionFile<E, GC>
			if (interactionFile.execute) {
				await interactionFile.execute(helper)
				if (!interactionFile.defer) {
					await interaction.deleteReply()
				}
			}

			const interactionFolder = interactionEntity as iInteractionFolder<E, GC>
			if (interactionFolder.files) {
				const subcommand = interaction.options.getSubcommand(true)
				const interactionFile = interactionFolder.files.get(subcommand)
				if (!interactionFile) return

				await interactionFile.execute(helper)
				if (!interactionFile.defer) {
					await interaction.deleteReply()
				}
			}
		} catch (err) {
			logger.error("Error executing command interaction", err)
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
	}

	private async onButtonInteraction(cache: GC, interaction: ButtonInteraction) {
		const buttonFile = this.buttonFiles.get(interaction.customId)
		if (!buttonFile) return

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
	}

	private async onSelectMenuInteraction(cache: GC, interaction: SelectMenuInteraction) {
		const menuFile = this.menuFiles.get(interaction.customId)
		if (!menuFile) return

		if (menuFile.defer) {
			await interaction
				.deferReply({ ephemeral: menuFile.ephemeral })
				.catch(err => logger.error("Failed to defer select menu interaction", err))
		}

		const helper = new MenuHelper(cache, interaction)
		try {
			await menuFile.execute(helper)
		} catch (err) {
			logger.error("Error executing select menu command", err)
			helper.respond(
				new ResponseBuilder(Emoji.BAD, "There was an error while executing this command!")
			)
		}
	}
}

export interface iMessageFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	condition: (helper: MessageHelper<E, GC>) => boolean
	execute: (helper: MessageHelper<E, GC>) => Promise<void>
}

export interface iInteractionFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	data: iInteractionData
	execute: (helper: InteractionHelper<E, GC>) => Promise<any>
}

export interface iInteractionSubcommandFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	data: iInteractionData
	execute: (helper: InteractionHelper<E, GC>) => Promise<any>
}

export interface iInteractionFolder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	data: SlashCommandBuilder
	files: Collection<string, iInteractionSubcommandFile<E, GC>>
}

export interface iButtonFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: ButtonHelper<E, GC>) => Promise<any>
}

export interface iMenuFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helpe3r: MenuHelper<E, GC>) => Promise<any>
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
