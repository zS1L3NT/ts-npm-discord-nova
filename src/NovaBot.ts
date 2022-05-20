import AfterEvery from "after-every"
import { BitFieldResolvable, Client, IntentsString } from "discord.js"
import { useTryAsync } from "no-try"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, EventSetupHelper, iBaseBotCache, iBaseGuildCache,
	SlashCommandDeployer
} from "./"

export type NovaOptions<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> = {
	intents: BitFieldResolvable<IntentsString, number>
	name: string
	directory: string

	help: {
		message: (cache: GC) => string
		icon: string
		commandRegex?: string
	}

	GuildCache: iBaseGuildCache<E, GC>
	BotCache: iBaseBotCache<E, GC, BC>

	onSetup?: (botCache: BC) => void
	logger: {
		discord: (...args: any[]) => void
		info: (...args: any[]) => void
		warn: (...args: any[]) => void
		error: (...args: any[]) => void
	}
}

export default class NovaBot<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	constructor(options: NovaOptions<E, GC, BC>) {
		const bot = new Client({ intents: options.intents })
		global.logger = options.logger

		const { GuildCache, BotCache } = options
		const esh = new EventSetupHelper<E, GC, BC>(GuildCache, BotCache, options, bot)
		const { botCache } = esh

		const blacklist: string[] = []

		bot.login(process.env.DISCORD__TOKEN)
		bot.on("ready", () => {
			logger.info(`Logged in as ${options.name}`)

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

			options.onSetup?.(botCache)

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
