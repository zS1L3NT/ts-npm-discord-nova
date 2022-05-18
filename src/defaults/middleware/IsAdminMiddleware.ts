import { GuildMember } from "discord.js"

import BaseEntry from "../../bases/BaseEntry"
import BaseGuildCache from "../../bases/BaseGuildCache"
import ResponseBuilder from "../../builders/ResponseBuilder"
import { SlashHelper, SlashMiddleware } from "../../interactions/slash"

export default class IsAdminMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends SlashMiddleware<E, GC> {
	handler(helper: SlashHelper<E, GC>): boolean | Promise<boolean> {
		const member = helper.interaction.member as GuildMember
		if (!member.permissions.has("ADMINISTRATOR") && member.id !== process.env.DISCORD__DEV_ID) {
			helper.respond(ResponseBuilder.bad("Only administrators can use this slash command"))
			return false
		}
		return true
	}
}
