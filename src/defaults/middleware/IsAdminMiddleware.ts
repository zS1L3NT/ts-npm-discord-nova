import { GuildMember } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandHelper, CommandMiddleware, ResponseBuilder } from "../.."

export default class IsAdminMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends CommandMiddleware<E, GC> {
	override handler(helper: CommandHelper<E, GC>): boolean | Promise<boolean> {
		if (!helper.member.permissions.has("ADMINISTRATOR") && helper.member.id !== process.env.DISCORD__DEV_ID) {
			helper.respond(ResponseBuilder.bad("Only administrators can use this slash command"))
			return false
		}
		return true
	}
}
