import { GuildMember } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandHelper, CommandMiddleware, ResponseBuilder } from "../.."

export default class IsAdminMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends CommandMiddleware<E, GC> {
	handler(helper: CommandHelper<E, GC>): boolean | Promise<boolean> {
		const member = (helper.interaction || helper.message)!.member as GuildMember
		if (!member.permissions.has("ADMINISTRATOR") && member.id !== process.env.DISCORD__DEV_ID) {
			helper.respond(ResponseBuilder.bad("Only administrators can use this slash command"))
			return false
		}
		return true
	}
}
