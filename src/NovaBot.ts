import { PrismaClient } from "@prisma/client"
import AfterEvery from "after-every"
import { BitFieldResolvable, Client, GatewayIntentsString, PermissionFlagsBits } from "discord.js"
import { useTryAsync } from "no-try"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, EventSetupHelper, FilesSetupHelper, iBaseBotCache,
	iBaseGuildCache, SlashCommandDeployer
} from "./"

export default abstract class NovaBot<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>
> {
	/**
	 * The display name of the bot.
	 * This will be logged when the bot is started
	 *
	 * @example "SounDroid#1491"
	 */
	abstract name: string
	/**
	 * The icon of the bot.
	 * This will be shown in the help command of the bot
	 *
	 * @example "https://cdn.discordapp.com/avatars/899858077027811379/56e8665909db40439b09e13627970b62.png?size=128"
	 */
	abstract icon: string
	/**
	 * The directory where Nova will look for button, command, event and selectMenu interactions.
	 * Any folder called `/buttons`, `/commands`, `/events`, `/selectMenus` or `/modals` within this directory will be added to the bot.
	 *
	 * @example path.join(__dirname, "interactions")
	 */
	abstract directory: string
	/**
	 * The client intents that the bot will use.
	 *
	 * {@link https://discordjs.guide/popular-topics/intents.html#privileged-intents}
	 */
	abstract intents: BitFieldResolvable<GatewayIntentsString, number>

	/**
	 * The text that the bot will show when the help command is used.
	 *
	 * You are provided with the GuildCache of the server that requested
	 * the help command for better customizability of the help command per server
	 *
	 * @example cache => `Welcome to SounDroid! My prefix is ${cache.prefix}`
	 */
	abstract helpMessage: (cache: GC) => string

	/**
	 * The GuildCache class that is used by your bot
	 */
	abstract GuildCache: iBaseGuildCache<P, E, GC>
	/**
	 * The BotCache class that is used by your bot
	 */
	abstract BotCache: iBaseBotCache<P, E, GC, BC>

	/**
	 * A logger that can be used by Nova to log events to the console.
	 *
	 * @example
	 * import Tracer from "tracer"
	 *
	 * class MyBot extends NovaBot {
	 *     // ...
	 *     logger = Tracer.console({})
	 *     // ...
	 * }
	 */
	abstract logger: {
		discord: (...args: any[]) => void
		info: (...args: any[]) => void
		warn: (...args: any[]) => void
		error: (...args: any[]) => void
	}

	/**
	 * Instance of the prisma database client
	 */
	 abstract prisma: P

	/**
	 * This method will get called once your bot receives the "ready" event from Discord
	 *
	 * @param botCache The bot cache that is used by your bot
	 */
	onSetup(botCache: BC) {}

	/**
	 * Method to start the bot
	 */
	start() {
		const bot = new Client({ intents: this.intents })
		global.logger = this.logger

		const botCache = new this.BotCache(this.GuildCache, bot, this.prisma)
		const fsh = new FilesSetupHelper<P, E, GC, BC>(this.directory, this.icon, this.helpMessage)
		const esh = new EventSetupHelper<P, E, GC, BC>(botCache, fsh)

		const blacklist: string[] = []

		bot.login(process.env.DISCORD__TOKEN)
		bot.on("ready", () => {
			logger.info(`Logged in as ${this.name}`)

			let i = 0
			let count = bot.guilds.cache.size
			const getTag = () => `[${`${++i}`.padStart(`${count}`.length, "0")}/${count}]`
			Promise.allSettled(
				bot.guilds.cache.map(async guild => {
					const [cacheErr, cache] = await useTryAsync(() => botCache.getGuildCache(guild))
					if (cacheErr) {
						blacklist.push(guild.id)
						return logger.error(
							getTag(),
							`❌ Couldn't find an entry for Guild(${guild.name})`
						)
					}

					const [deployErr] = await useTryAsync(() =>
						new SlashCommandDeployer(guild.id, esh.fsh.commandFiles).deploy()
					)
					if (deployErr) {
						blacklist.push(guild.id)
						return logger.error(
							getTag(),
							`❌ Couldn't get Slash Command permission for Guild(${guild.name})`
						)
					}

					cache.isAdministrator = guild.roles
						.botRoleFor(bot.user!)!
						.permissions.has(PermissionFlagsBits.Administrator)
					if (cache.isAdministrator) {
						await cache.updateMinutely()
					}

					logger.info(getTag(), `✅ Restored cache for Guild(${guild.name})`)
				})
			).then(() => {
				logger.info(`✅ All bot cache restored`)
			})

			this.onSetup(botCache)

			AfterEvery(1).minutes(async () => {
				for (const guild of bot.guilds.cache.toJSON()) {
					if (blacklist.includes(guild.id)) continue
					const cache = await botCache.getGuildCache(guild)
					if (cache.isAdministrator) {
						await cache.updateMinutely()
					}
				}
			})
		})
	}
}
