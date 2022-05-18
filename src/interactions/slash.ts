import {
	CommandInteraction, GuildChannel, GuildMember, InteractionReplyOptions, Role, User,
	WebhookEditMessageOptions
} from "discord.js"

import { BaseEntry, BaseGuildCache, iSlashData, ResponseBuilder } from "../"

export default abstract class BaseSlash<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	SMs extends SlashMiddleware<E, GC>[] = []
> {
	middleware: iSlashMiddleware<E, GC, SMs[number]>[] = []
	abstract defer: boolean
	abstract ephemeral: boolean
	abstract data: iSlashData

	abstract execute(helper: SlashHelper<E, GC>): Promise<any>
}

export abstract class BaseSlashSub<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract defer: boolean
	abstract ephemeral: boolean
	abstract data: iSlashData
	middleware: iSlashMiddleware<E, GC, any>[] = []

	abstract execute(helper: SlashHelper<E, GC>): Promise<any>
}

export type iSlashMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	SM extends SlashMiddleware<E, GC>
> = new () => SM

export abstract class SlashMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: SlashHelper<E, GC>): boolean | Promise<boolean>
}

export class SlashHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private responded = false

	public constructor(
		public readonly cache: GC,
		public readonly interaction: CommandInteraction
	) {}

	public respond(options: ResponseBuilder | WebhookEditMessageOptions | InteractionReplyOptions) {
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
