import AfterEvery from "after-every"
import { BitFieldResolvable, Client, Intents, IntentsString } from "discord.js"
import { useTryAsync } from "no-try"
import BaseBotCache, { iBaseBotCache } from "./bases/BaseBotCache"
import BaseDocument, { iBaseDocument, iBaseValue } from "./bases/BaseDocument"
import BaseGuildCache, { iBaseGuildCache } from "./bases/BaseGuildCache"
import BotSetupHelper from "./helpers/BotSetupHelper"
import SlashCommandDeployer from "./SlashCommandDeployer"

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
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>,
	BC extends BaseBotCache<V, D, GC>
> = {
	intents: BitFieldResolvable<IntentsString, number>
	name: string
	cwd: string
	config: iConfig
	updatesMinutely: boolean

	Document: iBaseDocument<V, D>
	GuildCache: iBaseGuildCache<V, D, GC>
	BotCache: iBaseBotCache<V, D, GC, BC>

	onSetup?: () => void
}

export default class NovaBot<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>,
	BC extends BaseBotCache<V, D, GC>
> {
	private readonly bot: Client
	private readonly options: NovaOptions<V, D, GC, BC>

	public constructor(options: NovaOptions<V, D, GC, BC>) {
		this.options = options
		this.bot = new Client({ intents: options.intents })
	}

	public start() {
		const { Document, GuildCache, BotCache } = this.options
		const botSetupHelper = new BotSetupHelper<V, D, GC, BC>(
			Document,
			GuildCache,
			BotCache,
			this.options.config,
			this.options.cwd,
			this.bot
		)
		const { botCache } = botSetupHelper

		this.bot.login(this.options.config.discord.token)
		this.bot.on("ready", async () => {
			console.log(`Logged in as ${this.options.name}`)

			let debugCount = 0

			let i = 0
			let count = this.bot.guilds.cache.size
			for (const guild of this.bot.guilds.cache.toJSON()) {
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
						this.options.config,
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

				if (this.options.updatesMinutely) {
					console.time(`Updated Channels for Guild(${guild.name}) [${debugCount}]`)
					cache.updateMinutely(debugCount)
					console.timeEnd(`Updated Channels for Guild(${guild.name}) [${debugCount}]`)
				}

				console.log(`${tag} ✅ Restored cache for Guild(${guild.name})`)
			}
			console.log(`✅ All bot cache restored`)
			console.log("|")

			this.options.onSetup?.()

			if (this.options.updatesMinutely) {
				AfterEvery(1).minutes(async () => {
					debugCount++
					for (const guild of this.bot.guilds.cache.toJSON()) {
						const cache = await botCache.getGuildCache(guild)
						cache.updateMinutely(debugCount)
					}
				})
			}
		})
	}
}
