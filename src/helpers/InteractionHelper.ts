import {
	CommandInteraction,
	GuildChannel,
	GuildMember,
	InteractionReplyOptions,
	MessagePayload,
	Role,
	User
} from "discord.js"
import BaseDocument, { iBaseValue } from "../bases/BaseDocument"
import BaseGuildCache from "../bases/BaseGuildCache"
import ResponseBuilder from "../builders/ResponseBuilder"

export default class InteractionHelper<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>
> {
	public readonly cache: GC
	public readonly interaction: CommandInteraction
	private responded = false

	public constructor(cache: GC, interaction: CommandInteraction) {
		this.cache = cache
		this.interaction = interaction
	}

	public respond(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
		if (this.responded) {
			if (options instanceof ResponseBuilder) {
				this.interaction
					.editReply({
						embeds: [options.build()]
					})
					.catch(() => {})
			} else {
				this.interaction.editReply(options).catch(() => {})
			}
		} else {
			if (options instanceof ResponseBuilder) {
				this.interaction
					.followUp({
						embeds: [options.build()]
					})
					.catch(() => {})
			} else {
				this.interaction.followUp(options).catch(() => {})
			}
			this.responded = true
		}
	}

	public mentionable(name: string) {
		return this.interaction.options.getMentionable(name) as User | GuildMember | Role | null
	}

	public channel(name: string) {
		return this.interaction.options.getChannel(name) as GuildChannel | null
	}

	public role(name: string) {
		return this.interaction.options.getRole(name) as Role | null
	}

	public user(name: string) {
		return this.interaction.options.getUser(name)
	}

	public string(name: string) {
		return this.interaction.options.getString(name)
	}

	public integer(name: string) {
		return this.interaction.options.getInteger(name)
	}

	public boolean(name: string) {
		return this.interaction.options.getBoolean(name)
	}
}
