import BaseBotCache, { iBaseBotCache } from "../bases/BaseBotCache"
import BaseDocument, { iBaseDocument, iBaseValue } from "../bases/BaseDocument"
import BaseGuildCache, { iBaseGuildCache } from "../bases/BaseGuildCache"
import ButtonHelper from "./ButtonHelper"
import fs from "fs"
import InteractionHelper from "./InteractionHelper"
import MenuHelper from "./MenuHelper"
import MessageHelper from "./MessageHelper"
import path from "path"
import ResponseBuilder, { Emoji } from "../builders/ResponseBuilder"
import SlashCommandDeployer from "../SlashCommandDeployer"
import { Client, Collection } from "discord.js"
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"
import { iConfig } from "../DiscordNova"

export default class BotSetupHelper<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>,
	BC extends BaseBotCache<V, D, GC>
> {
	private readonly DClass: iBaseDocument<V, D>
	private readonly GCClass: iBaseGuildCache<V, D, GC>

	public readonly cwd: string
	public readonly botCache: BC
	public readonly interactionFiles: Collection<
		string,
		iInteractionFile<V, D> | iInteractionFolder<V, D>
	>
	public readonly buttonFiles: Collection<string, iButtonFile<V, D>>
	public readonly menuFiles: Collection<string, iMenuFile<V, D>>
	private readonly bot: Client
	private readonly messageFiles: iMessageFile<V, D>[]

	constructor(
		DClass: iBaseDocument<V, D>,
		GCClass: iBaseGuildCache<V, D, GC>,
		BCClass: iBaseBotCache<V, D, GC, BC>,
		config: iConfig,
		cwd: string,
		bot: Client
	) {
		this.DClass = DClass
		this.GCClass = GCClass

		this.cwd = cwd
		this.bot = bot
		this.botCache = new BCClass(this.DClass, this.GCClass, this.bot)
		this.messageFiles = []
		this.interactionFiles = new Collection<
			string,
			iInteractionFile<V, D> | iInteractionFolder<V, D>
		>()
		this.buttonFiles = new Collection<string, iButtonFile<V, D>>()
		this.menuFiles = new Collection<string, iMenuFile<V, D>>()

		this.setupMessageCommands()
		this.setupInteractionCommands()
		this.setupButtonCommands()
		this.setupMenuCommands()

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
					? (interactionEntity as iInteractionFile<V, D>).ephemeral
					: (interactionEntity as iInteractionFolder<V, D>).files.get(
							interaction.options.getSubcommand(true)
					  )!.ephemeral

				await interaction
					.deferReply({ ephemeral })
					.catch(err => console.error("Failed to defer interaction", err))

				const helper = new InteractionHelper(cache, interaction)
				try {
					const interactionFile = interactionEntity as iInteractionFile<V, D>
					if (interactionFile.execute) {
						await interactionFile.execute(helper)
						if (!interactionFile.defer) {
							await interaction.deleteReply()
						}
					}

					const interactionFolder = interactionEntity as iInteractionFolder<V, D>
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
			await new SlashCommandDeployer(guild.id, config, this.interactionFiles)
		})

		this.bot.on("guildDelete", async guild => {
			console.log(`Removed from Guild(${guild.name})`)
			await this.botCache.eraseGuildCache(guild.id)
		})
	}

	private static isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private setupMessageCommands() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.cwd, "../messages")))

		if (err) return

		for (const fileName of fileNames) {
			const file = require(path.join(this.cwd, `../messages/${fileName}`)) as iMessageFile<
				V,
				D
			>
			this.messageFiles.push(file)
		}
	}

	private setupInteractionCommands() {
		const [err, entityNames] = useTry(() => fs.readdirSync(path.join(this.cwd, "../commands")))

		if (err) return

		// Slash subcommands
		const folderNames = entityNames.filter(f => !BotSetupHelper.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.cwd, `../commands/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iInteractionSubcommandFile<V, D>> = new Collection()
			for (const fileName of fileNames) {
				const file = require(path.join(
					this.cwd,
					`../commands/${folderName}/${fileName}`
				)) as iInteractionSubcommandFile<V, D>
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
			const file = require(path.join(
				this.cwd,
				`../commands/${filename}`
			)) as iInteractionFile<V, D>
			this.interactionFiles.set(file.builder.name, file)
		}
	}

	private setupButtonCommands() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.cwd, "../buttons")))

		if (err) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]
			const file = require(path.join(this.cwd, `../buttons/${fileName}`)) as iButtonFile<V, D>
			this.buttonFiles.set(name, file)
		}
	}

	private setupMenuCommands() {
		const [err, fileNames] = useTry(() => fs.readdirSync(path.join(this.cwd, "../menus")))

		if (err) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]
			const file = require(path.join(this.cwd, `../menus/${fileName}`)) as iMenuFile<V, D>
			this.menuFiles.set(name, file)
		}
	}
}

export interface iMessageFile<V extends iBaseValue, D extends BaseDocument<V, D>> {
	condition: (helper: MessageHelper<V, D>) => boolean
	execute: (helper: MessageHelper<V, D>) => Promise<void>
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

export interface iInteractionFile<V extends iBaseValue, D extends BaseDocument<V, D>> {
	defer: boolean
	ephemeral: boolean
	help: iInteractionHelp
	builder: SlashCommandBuilder
	execute: (helper: InteractionHelper<V, D>) => Promise<any>
}

export interface iInteractionSubcommandFile<V extends iBaseValue, D extends BaseDocument<V, D>> {
	defer: boolean
	ephemeral: boolean
	help: iInteractionHelp
	builder: SlashCommandSubcommandBuilder
	execute: (helper: InteractionHelper<V, D>) => Promise<any>
}

export interface iInteractionFolder<V extends iBaseValue, D extends BaseDocument<V, D>> {
	builder: SlashCommandBuilder
	files: Collection<string, iInteractionSubcommandFile<V, D>>
}

export interface iButtonFile<V extends iBaseValue, D extends BaseDocument<V, D>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: ButtonHelper<V, D>) => Promise<any>
}

export interface iMenuFile<V extends iBaseValue, D extends BaseDocument<V, D>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: MenuHelper<V, D>) => Promise<any>
}
