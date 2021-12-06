import { BaseGuildCache, BaseRecord, ResponseBuilder } from ".."
import {
	CommandInteraction,
	GuildChannel,
	GuildMember,
	InteractionReplyOptions,
	MessagePayload,
	Role,
	User
} from "discord.js"

export default class InteractionHelper<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
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
