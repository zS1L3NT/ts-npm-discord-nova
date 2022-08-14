import {
	ButtonInteraction, CommandInteraction, Message, ModalSubmitInteraction, SelectMenuInteraction
} from "discord.js"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, ButtonHelper, CommandHelper, CommandType,
	FilesSetupHelper, ModalHelper, ResponseBuilder, SelectMenuHelper
} from "../"

export default class EventSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	constructor(private readonly botCache: BC, public readonly fsh: FilesSetupHelper<E, GC, BC>) {
		for (const eventFile of this.fsh.eventFiles) {
			this.botCache.bot.on(eventFile.name, async (...args) => {
				let broke = false
				for (const middleware of eventFile.middleware) {
					if (await middleware.handler(this.botCache, ...args)) continue
					broke = true
					break
				}

				if (!broke) await eventFile.execute(this.botCache, ...args)
			})
		}

		this.botCache.bot.on("messageCreate", async message => {
			if (message.author.bot) return
			if (!message.guild) return
			const cache = await this.botCache.getGuildCache(message.guild!)
			if (!cache.isAdministrator) return

			await this.onMessage(cache, message)
		})

		this.botCache.bot.on("interactionCreate", async interaction => {
			if (!interaction.guild) return
			const cache = await this.botCache.getGuildCache(interaction.guild!)
			if (!cache.isAdministrator) return

			if (interaction.isCommand()) await this.onSlashInteraction(cache, interaction)
			if (interaction.isButton()) await this.onButtonInteraction(cache, interaction)
			if (interaction.isSelectMenu()) await this.onSelectMenuInteraction(cache, interaction)
			if (interaction.isModalSubmit()) await this.onModalInteraction(cache, interaction)
		})
	}

	private async onMessage(cache: GC, message: Message) {
		if (!cache.entry.prefix) return

		for (const [name, commandFile] of this.fsh.commandFiles) {
			const helper = new CommandHelper(name, CommandType.Message, cache, undefined, message)

			if (commandFile.only === CommandType.Slash) continue
			if (!commandFile.condition(helper)) continue

			logger.discord(`Opening MessageCommand(${name}) for User(${message.author.tag})`)

			try {
				helper.params = commandFile.converter(helper) ?? {}
				await message.channel
					.sendTyping()
					.catch(err => logger.warn("Failed to send typing after message command", err))

				let broke = false
				for (const middleware of commandFile.middleware) {
					if (await middleware.handler(helper)) continue
					broke = true
					break
				}

				if (!broke) await commandFile.execute(helper)
			} catch (err) {
				logger.error("Error executing message command", err)
				helper.respond(
					ResponseBuilder.bad("There was an error while executing this command!")
				)
			}

			logger.discord(`Closing MessageCommand(${name}) for User(${message.author.tag})`)
			break
		}
	}

	private async onSlashInteraction(cache: GC, interaction: CommandInteraction) {
		const commandFile = this.fsh.commandFiles.get(interaction.commandName)
		if (!commandFile) return

		logger.discord(
			`Opening SlashInteraction(${interaction.commandName}) for User(${interaction.user.tag})`
		)

		const helper = new CommandHelper(
			interaction.commandName,
			CommandType.Slash,
			cache,
			interaction,
			undefined
		)

		if (commandFile.defer) {
			await interaction
				.deferReply({ ephemeral: commandFile.ephemeral })
				.catch(err => logger.error("Failed to defer slash interaction", err))
		}

		try {
			let broke = false
			for (const middleware of commandFile.middleware) {
				if (await middleware.handler(helper)) continue
				broke = true
				break
			}

			if (!broke) {
				await commandFile.execute(helper)
			}
		} catch (err) {
			logger.error("Error executing slash interaction", err)
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
			for (const middleware of buttonFile.middleware) {
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
			for (const middleware of selectMenuFile.middleware) {
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

	private async onModalInteraction(cache: GC, interaction: ModalSubmitInteraction) {
		const modalFile = this.fsh.modalFiles.get(interaction.customId)
		if (!modalFile) return
		logger.discord(
			`Opening ModalInteraction(${interaction.customId}) for User(${interaction.user.tag})`
		)

		if (modalFile.defer) {
			await interaction
				.deferReply({ ephemeral: modalFile.ephemeral })
				.catch(err => logger.error("Failed to defer select menu interaction", err))
		}

		const helper = new ModalHelper(cache, interaction)
		try {
			let broke = false
			for (const middleware of modalFile.middleware) {
				if (await middleware.handler(helper)) continue
				broke = true
				break
			}

			if (!broke) await modalFile.execute(helper)
		} catch (err) {
			logger.error("Error executing select menu command", err)
			helper.respond(ResponseBuilder.bad("There was an error while executing this command!"))
		}
	}
}
