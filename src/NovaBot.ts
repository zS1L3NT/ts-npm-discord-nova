import AfterEvery from "after-every"
import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	BotSetupHelper,
	iBaseBotCache,
	iBaseGuildCache,
	SlashCommandDeployer
} from "."
import { BitFieldResolvable, Client, IntentsString } from "discord.js"
import { Tracer } from "tracer"
import { useTryAsync } from "no-try"

export type iConfig = {
	firebase: {
		service_account: {
			projectId: string
			privateKey: string
			clientEmail: string
		}
		collection: string
		database_url: string
	}
	discord: {
		token: string
		bot_id: string
		dev_id: string
	}
}

export type NovaOptions<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> = {
	intents: BitFieldResolvable<IntentsString, number>
	name: string
	cwd: string
	config: iConfig
	updatesMinutely: boolean

	help: {
		message: (cache: GC) => string
		icon: string
		commandRegex?: string
	}

	GuildCache: iBaseGuildCache<E, GC>
	BotCache: iBaseBotCache<E, GC, BC>

	onSetup?: (botCache: BC) => void
	logger: Tracer.Logger | Console
}

export default class NovaBot<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public constructor(options: NovaOptions<E, GC, BC>) {
		const bot = new Client({ intents: options.intents })
		global.logger = options.logger

		const { GuildCache, BotCache } = options
		const botSetupHelper = new BotSetupHelper<E, GC, BC>(GuildCache, BotCache, options, bot)
		const { botCache } = botSetupHelper

		bot.login(options.config.discord.token)
		bot.on("ready", async () => {
			logger.info(`Logged in as ${options.name}`)

			let debugCount = 0

			let i = 0
			let count = bot.guilds.cache.size
			for (const guild of bot.guilds.cache.toJSON()) {
				const tag = `[${(++i).toString().padStart(count.toString().length, "0")}/${count}]`
				const [cacheErr, cache] = await useTryAsync(() => botCache.getGuildCache(guild))
				if (cacheErr) {
					logger.error(
						tag,
						`❌ Couldn't find a Firebase Document for Guild(${guild.name})`
					)
					guild.leave()
					continue
				}

				const [deployErr] = await useTryAsync(() =>
					new SlashCommandDeployer(
						guild.id,
						options.config,
						botSetupHelper.interactionFiles
					).deploy()
				)
				if (deployErr) {
					logger.error(
						tag,
						`❌ Couldn't get Slash Command permission for Guild(${guild.name})`
					)
					guild.leave()
					continue
				}

				if (options.updatesMinutely) {
					await cache.updateMinutely(debugCount)
				}

				logger.info(tag, `✅ Restored cache for Guild(${guild.name})`)
			}
			logger.info(`✅ All bot cache restored`)

			options.onSetup?.(botCache)

			if (options.updatesMinutely) {
				AfterEvery(1).minutes(async () => {
					debugCount++
					for (const guild of bot.guilds.cache.toJSON()) {
						const cache = await botCache.getGuildCache(guild)
						cache.updateMinutely(debugCount)
					}
				})
			}
		})
	}
}
