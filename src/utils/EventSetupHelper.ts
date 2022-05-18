import {
	ButtonInteraction, Client, CommandInteraction, Message, SelectMenuInteraction
} from "discord.js"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSlash, ButtonHelper, ButtonMiddleware,
	EventMiddleware, FilesSetupHelper, iBaseBotCache, iBaseGuildCache, iSlashFolder, MessageHelper,
	MessageMiddleware, NovaOptions, ResponseBuilder, SelectMenuHelper, SelectMenuMiddleware,
	SlashHelper, SlashMiddleware
} from "../"

export default class EventSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public readonly botCache: BC
	public readonly fsh: FilesSetupHelper<E, GC, BC>

	public constructor(
		private readonly GCClass: iBaseGuildCache<E, GC>,
		BCClass: iBaseBotCache<E, GC, BC>,
		public readonly options: NovaOptions<E, GC, BC>,
		private readonly bot: Client
	) {
		this.botCache = new BCClass(this.GCClass, this.bot)
		this.fsh = new FilesSetupHelper(this.options)

		for (const eventFile of this.fsh.eventFiles) {
			this.bot.on(eventFile.name, async (...args) => {
				let broke = false
				for (const middlewareClass of eventFile.middleware) {
					const middleware = new middlewareClass() as EventMiddleware<E, GC, BC, any>
					if (await middleware.handler(this.botCache, ...args)) continue
					broke = true
					break
				}

				if (!broke) await eventFile.execute(this.botCache, ...args)
			})
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

	private async onMessage(cache: GC, message: Message) {
		const helper = new MessageHelper(cache, message)

		for (const [fileName, messageFile] of this.fsh.messageFiles) {
			if (messageFile.condition(helper)) {
				logger.discord(
					`Opening MessageCommand(${fileName}) for User(${message.author.tag})`
				)
				try {
					message.channel
						.sendTyping()
						.catch(err =>
							logger.warn("Failed to send typing after message command", err)
						)

					let broke = false
					for (const middlewareClass of messageFile.middleware) {
						const middleware = new middlewareClass() as MessageMiddleware<E, GC>
						if (await middleware.handler(helper)) continue
						broke = true
						break
					}

					if (!broke) await messageFile.execute(helper)
				} catch (err) {
					logger.error("Error executing message command", err)
					helper.respond(
						ResponseBuilder.bad("There was an error while executing this command!")
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
		const slashEntity = this.fsh.slashFiles.get(interaction.commandName)
		if (!slashEntity) return
		logger.discord(
			`Opening SlashInteraction(${interaction.commandName}) for User(${interaction.user.tag})`
		)

		const subcommand = interaction.options.getSubcommand(false)
		const ephemeral = Object.keys(slashEntity).includes("ephemeral")
			? (slashEntity as BaseSlash<E, GC>).ephemeral
			: (slashEntity as iSlashFolder<E, GC>).files.get(subcommand!)!.ephemeral

		await interaction
			.deferReply({ ephemeral })
			.catch(err => logger.error("Failed to defer command interaction", err))

		const helper = new SlashHelper(cache, interaction)
		try {
			const slashFile =
				"files" in slashEntity ? slashEntity.files.get(subcommand!)! : slashEntity

			let broke = false
			for (const middlewareClass of slashFile.middleware) {
				const middleware = new middlewareClass() as SlashMiddleware<E, GC>
				if (await middleware.handler(helper)) continue
				broke = true
				break
			}

			if (!broke) await slashFile.execute(helper)

			if (!slashFile.defer) {
				await interaction.deleteReply()
			}
		} catch (err) {
			logger.error("Error executing command interaction", err)
			helper.respond(ResponseBuilder.bad("There was an error while executing this command!"))
		}
		logger.discord(
			`Closing SlashInteraction(${interaction.commandName}) for User(${interaction.user.tag})`
		)
	}

	private async onButtonInteraction(cache: GC, interaction: ButtonInteraction) {
		const buttonFile = this.fsh.buttonFiles.get(interaction.customId)
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
			let broke = false
			for (const middlewareClass of buttonFile.middleware) {
				const middleware = new middlewareClass() as ButtonMiddleware<E, GC>
				if (await middleware.handler(helper)) continue
				broke = true
				break
			}

			if (!broke) await buttonFile.execute(helper)
		} catch (err) {
			logger.error("Error executing button interaction", err)
			helper.respond(ResponseBuilder.bad("There was an error while executing this command!"))
		}
		logger.discord(
			`Closing ButtonInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)
	}

	private async onSelectMenuInteraction(cache: GC, interaction: SelectMenuInteraction) {
		const selectMenuFile = this.fsh.selectMenuFiles.get(interaction.customId)
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
			let broke = false
			for (const middlewareClass of selectMenuFile.middleware) {
				const middleware = new middlewareClass() as SelectMenuMiddleware<E, GC>
				if (await middleware.handler(helper)) continue
				broke = true
				break
			}

			if (!broke) await selectMenuFile.execute(helper)
		} catch (err) {
			logger.error("Error executing select menu command", err)
			helper.respond(ResponseBuilder.bad("There was an error while executing this command!"))
		}
		logger.discord(
			`Closing SelectMenuInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)
	}
}
