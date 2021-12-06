import ButtonHelper from "./ButtonHelper"
import fs from "fs"
import InteractionHelper from "./InteractionHelper"
import MenuHelper from "./MenuHelper"
import MessageHelper from "./MessageHelper"
import path from "path"
import {
	BaseBotCache,
	BaseGuildCache,
	BaseRecord,
	Emoji,
	HelpBuilder,
	iBaseBotCache,
	iBaseGuildCache,
	NovaOptions,
	ResponseBuilder,
	SlashCommandDeployer
} from ".."
import { Client, ClientEvents, Collection } from "discord.js"
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"

export default class BotSetupHelper<
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>,
	BC extends BaseBotCache<R, GC>
> {
	private readonly GCClass: iBaseGuildCache<R, GC>

	private readonly bot: Client
	public readonly options: NovaOptions<R, GC, BC>
	public readonly botCache: BC
	public readonly interactionFiles: Collection<
		string,
		iInteractionFile<R, GC> | iInteractionFolder<R, GC>
	>
	public readonly buttonFiles: Collection<string, iButtonFile<R, GC>>
	public readonly menuFiles: Collection<string, iMenuFile<R, GC>>
	public readonly messageFiles: iMessageFile<R, GC>[]
	public readonly eventFiles: iEventFile<R, GC, BC, keyof ClientEvents>[]

	constructor(
		GCClass: iBaseGuildCache<R, GC>,
		BCClass: iBaseBotCache<R, GC, BC>,
		options: NovaOptions<R, GC, BC>,
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
			iInteractionFile<R, GC> | iInteractionFolder<R, GC>
		>()
		this.buttonFiles = new Collection<string, iButtonFile<R, GC>>()
		this.menuFiles = new Collection<string, iMenuFile<R, GC>>()

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

			const helper = new MessageHelper(cache, message)
			try {
				for (const messageFile of this.messageFiles) {
					if (messageFile.condition(helper)) {
						message.react("⌛").catch(() => {})
						await messageFile.execute(helper)
						break
					}
				}
			} catch (error) {
				console.error(error)
			}
		})

		this.bot.on("messageCreate", async message => {
			if (message.author.bot) return
			if (!message.guild) return
			const cache = await this.botCache.getGuildCache(message.guild!)

			const helper = new MessageHelper(cache, message)
			try {
				for (const messageFile of this.messageFiles) {
					if (messageFile.condition(helper)) {
						message.react("⌛").catch(() => {})
						await messageFile.execute(helper)
						break
					}
				}
			} catch (error) {
				console.error(error)
				helper.reactFailure()
				helper.respond(
					new ResponseBuilder(
						Emoji.BAD,
						"There was an error while executing this command!"
					)
				)
			}
		})

		this.bot.on("interactionCreate", async interaction => {
			if (!interaction.guild) return
			const cache = await this.botCache.getGuildCache(interaction.guild!)

			if (interaction.isCommand()) {
				const interactionEntity = this.interactionFiles.get(interaction.commandName)
				if (!interactionEntity) return

				const ephemeral = Object.keys(interactionEntity).includes("ephemeral")
					? (interactionEntity as iInteractionFile<R, GC>).ephemeral
					: (interactionEntity as iInteractionFolder<R, GC>).files.get(
							interaction.options.getSubcommand(true)
					  )!.ephemeral

				await interaction
					.deferReply({ ephemeral })
					.catch(err => console.error("Failed to defer interaction", err))

				const helper = new InteractionHelper(cache, interaction)
				try {
					const interactionFile = interactionEntity as iInteractionFile<R, GC>
					if (interactionFile.execute) {
						await interactionFile.execute(helper)
						if (!interactionFile.defer) {
							await interaction.deleteReply()
						}
					}

					const interactionFolder = interactionEntity as iInteractionFolder<R, GC>
					if (interactionFolder.files) {
						const subcommand = interaction.options.getSubcommand(true)
						const interactionFile = interactionFolder.files.get(subcommand)
						if (!interactionFile) return

						await interactionFile.execute(helper)
						if (!interactionFile.defer) {
							await interaction.deleteReply()
						}
					}
				} catch (error) {
					console.error(error)
					helper.respond(
						new ResponseBuilder(
							Emoji.BAD,
							"There was an error while executing this command!"
						)
					)
				}
			}

			if (interaction.isButton()) {
				const buttonFile = this.buttonFiles.get(interaction.customId)
				if (!buttonFile) return

				if (buttonFile.defer) {
					await interaction
						.deferReply({ ephemeral: buttonFile.ephemeral })
						.catch(() => console.error("Failed to defer interaction"))
				}

				const helper = new ButtonHelper(cache, interaction)
				try {
					await buttonFile.execute(helper)
				} catch (error) {
					console.error(error)
					helper.respond(
						new ResponseBuilder(
							Emoji.BAD,
							"There was an error while executing this command!"
						)
					)
				}
			}

			if (interaction.isSelectMenu()) {
				const menuFile = this.menuFiles.get(interaction.customId)
				if (!menuFile) return

				if (menuFile.defer) {
					await interaction
						.deferReply({ ephemeral: menuFile.ephemeral })
						.catch(() => console.error("Failed to defer interaction"))
				}

				const helper = new MenuHelper(cache, interaction)
				try {
					await menuFile.execute(helper)
				} catch (error) {
					console.error(error)
					helper.respond(
						new ResponseBuilder(
							Emoji.BAD,
							"There was an error while executing this command!"
						)
					)
				}
			}
		})

		this.bot.on("guildCreate", async guild => {
			console.log(`Added to Guild(${guild.name})`)
			await this.botCache.registerGuildCache(guild.id)
			await new SlashCommandDeployer(guild.id, this.options.config, this.interactionFiles)
		})

		this.bot.on("guildDelete", async guild => {
			console.log(`Removed from Guild(${guild.name})`)
			await this.botCache.eraseGuildCache(guild.id)
		})
	}

	private static isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private setupMessages() {
		const [err, fileNames] = useTry(() =>
			fs.readdirSync(path.join(this.options.cwd, "messages"))
		)

		if (err) return

		for (const fileName of fileNames) {
			const file = this.require<iMessageFile<R, GC>>(`messages/${fileName}`)
			this.messageFiles.push(file)
		}
	}

	private setupCommands() {
		this.interactionFiles.set("help", {
			defer: false,
			ephemeral: false,
			help: {
				description: "Shows you the help menu that you are looking at right now",
				params: []
			},
			builder: new SlashCommandBuilder()
				.setName("help")
				.setDescription("Displays the help command"),
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

		if (err) return

		// Slash subcommands
		const folderNames = entityNames.filter(f => !BotSetupHelper.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.options.cwd, `commands/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iInteractionSubcommandFile<R, GC>> = new Collection()
			for (const fileName of fileNames) {
				const file = this.require<iInteractionSubcommandFile<R, GC>>(
					`commands/${folderName}/${fileName}`
				)
				files.set(file.builder.name, file)
				builder.addSubcommand(file.builder)
			}

			this.interactionFiles.set(folderName, {
				builder,
				files
			})
		}

		// Slash commands
		const fileNames = entityNames.filter(f => BotSetupHelper.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iInteractionFile<R, GC>>(`commands/${filename}`)
			this.interactionFiles.set(file.builder.name, file)
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

		if (err) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]
			const file = this.require<iButtonFile<R, GC>>(`buttons/${fileName}`)
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

		if (err) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]
			const file = this.require<iMenuFile<R, GC>>(`menus/${fileName}`)
			this.menuFiles.set(name, file)
		}
	}

	private setupEvents() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.options.cwd, "events")))

		if (err) return

		for (const fileName of fileNames) {
			const file = this.require<iEventFile<R, GC, BC, keyof ClientEvents>>(
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
}

export interface iMessageFile<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	condition: (helper: MessageHelper<R, GC>) => boolean
	execute: (helper: MessageHelper<R, GC>) => Promise<void>
}

export interface iInteractionHelp {
	description: string
	params: {
		name: string
		description: string
		requirements: string
		required: boolean
		default?: string
	}[]
}

export interface iInteractionFile<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	defer: boolean
	ephemeral: boolean
	help: iInteractionHelp
	builder: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	execute: (helper: InteractionHelper<R, GC>) => Promise<any>
}

export interface iInteractionSubcommandFile<
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>
> {
	defer: boolean
	ephemeral: boolean
	help: iInteractionHelp
	builder: SlashCommandSubcommandBuilder
	execute: (helper: InteractionHelper<R, GC>) => Promise<any>
}

export interface iInteractionFolder<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	builder: SlashCommandBuilder
	files: Collection<string, iInteractionSubcommandFile<R, GC>>
}

export interface iButtonFile<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: ButtonHelper<R, GC>) => Promise<any>
}

export interface iMenuFile<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helpe3r: MenuHelper<R, GC>) => Promise<any>
}

export interface iEventFile<
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>,
	BC extends BaseBotCache<R, GC>,
	N extends keyof ClientEvents
> {
	name: N
	execute: (botCache: BC, ...args: ClientEvents[N]) => Promise<any>
}
