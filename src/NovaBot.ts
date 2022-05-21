import AfterEvery from "after-every"
import { BitFieldResolvable, Client, IntentsString } from "discord.js"
import { useTryAsync } from "no-try"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, EventSetupHelper, FilesSetupHelper, iBaseBotCache,
	iBaseGuildCache, SlashCommandDeployer
} from "./"

export default abstract class NovaBot<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	abstract name: string
	abstract icon: string
	abstract directory: string
	abstract intents: BitFieldResolvable<IntentsString, number>

	abstract helpMessage: (cache: GC) => string

	abstract GuildCache: iBaseGuildCache<E, GC>
	abstract BotCache: iBaseBotCache<E, GC, BC>

	abstract logger: {
		discord: (...args: any[]) => void
		info: (...args: any[]) => void
		warn: (...args: any[]) => void
		error: (...args: any[]) => void
	}

	onSetup(botCache: BC) {}

	start() {
		const bot = new Client({ intents: this.intents })
		global.logger = this.logger

		const botCache = new this.BotCache(this.GuildCache, bot)
		const fsh = new FilesSetupHelper<E, GC, BC>(this.directory, this.icon, this.helpMessage)
		const esh = new EventSetupHelper<E, GC, BC>(botCache, fsh)

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
							`❌ Couldn't find a Firebase Document for Guild(${guild.name})`
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

					await cache.updateMinutely()

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
					cache.updateMinutely()
				}
			})
		})
	}
}
