import { BaseEntry, BaseGuildCache, ResponseBuilder } from ".."
import {
	CommandInteraction,
	GuildChannel,
	GuildMember,
	InteractionReplyOptions,
	MessagePayload,
	Role,
	User
} from "discord.js"

export interface iSlashData {
	name: string
	description: {
		slash: string
		help: string
	}
	options?: (iSlashDefaultOption | iSlashStringOption | iSlashNumberOption)[]
}

interface iSlashOption {
	name: string
	description: {
		slash: string
		help: string
	}
	requirements: string
	required: boolean
	default?: string
}

interface iSlashDefaultOption extends iSlashOption {
	type: "boolean" | "user" | "role" | "channel" | "mentionable"
}

interface iSlashStringOption extends iSlashOption {
	type: "string"
	choices?: {
		name: string
		value: string
	}[]
}

interface iSlashNumberOption extends iSlashOption {
	type: "number"
	choices?: {
		name: string
		value: number
	}[]
}

export default class SlashHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private responded = false

	public constructor(
		public readonly cache: GC,
		public readonly interaction: CommandInteraction
	) {}

	public respond(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
		if (this.responded) {
			if (options instanceof ResponseBuilder) {
				this.interaction
					.editReply({ embeds: [options.build()] })
					.catch(err => logger.warn("Failed to edit command interaction", err))
			} else {
				this.interaction
					.editReply(options)
					.catch(err => logger.warn("Failed to edit command interaction", err))
			}
		} else {
			if (options instanceof ResponseBuilder) {
				this.interaction
					.followUp({ embeds: [options.build()] })
					.catch(err => logger.warn("Failed to follow up command interaction", err))
			} else {
				this.interaction
					.followUp(options)
					.catch(err => logger.warn("Failed to follow up command interaction", err))
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
