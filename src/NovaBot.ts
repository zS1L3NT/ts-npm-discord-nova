import AfterEvery from "after-every"
import {
	BaseBotCache,
	BaseGuildCache,
	BaseRecord,
	BotSetupHelper,
	iBaseBotCache,
	iBaseGuildCache,
	SlashCommandDeployer
} from "."
import { BitFieldResolvable, Client, IntentsString } from "discord.js"
import { useTryAsync } from "no-try"

export type iConfig = {
	firebase: {
		service_account: any
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
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>,
	BC extends BaseBotCache<R, GC>
> = {
	intents: BitFieldResolvable<IntentsString, number>
	name: string
	cwd: string
	config: iConfig
	updatesMinutely: boolean

	help: {
		message: (cache: GC) => string
		icon: string
	}

	GuildCache: iBaseGuildCache<R, GC>
	BotCache: iBaseBotCache<R, GC, BC>

	onSetup?: (botCache: BC) => void
}

export default class NovaBot<
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>,
	BC extends BaseBotCache<R, GC>
> {
	public constructor(options: NovaOptions<R, GC, BC>) {
		const bot = new Client({ intents: options.intents })

		const { GuildCache, BotCache } = options
		const botSetupHelper = new BotSetupHelper<R, GC, BC>(GuildCache, BotCache, options, bot)
		const { botCache } = botSetupHelper

		bot.login(options.config.discord.token)
		bot.on("ready", async () => {
			console.log(`Logged in as ${options.name}`)

			let debugCount = 0

			let i = 0
			let count = bot.guilds.cache.size
			for (const guild of bot.guilds.cache.toJSON()) {
				const tag = `${(++i).toString().padStart(count.toString().length, "0")}/${count}`
				const [cacheErr, cache] = await useTryAsync(() => botCache.getGuildCache(guild))
				if (cacheErr) {
					console.error(
						`${tag} ❌ Couldn't find a Firebase Document for Guild(${guild.name})`
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
					console.error(
						`${tag} ❌ Couldn't get Slash Command permission for Guild(${guild.name})`
					)
					guild.leave()
					continue
				}

				if (options.updatesMinutely) {
					await cache.updateMinutely(debugCount)
				}

				console.log(`${tag} ✅ Restored cache for Guild(${guild.name})`)
			}
			console.log(`✅ All bot cache restored`)
			console.log("|")

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
