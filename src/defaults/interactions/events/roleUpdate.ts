import { Colors, PermissionFlagsBits, Role } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseBotCache, BaseEntry, BaseEvent, BaseGuildCache } from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>
> extends BaseEvent<P, E, GC, BC, "roleUpdate"> {
	override name = "roleUpdate" as const

	override middleware = []

	override async execute(botCache: BC, oldRole: Role, newRole: Role) {
		if (!oldRole.managed) return
		const member = oldRole.members.find(m => m.user.id === botCache.bot.user!.id)
		if (!member) return
		const cache = await botCache.getGuildCache(member.guild)

		if (
			oldRole.permissions.has(PermissionFlagsBits.Administrator) &&
			newRole.permissions.missing(PermissionFlagsBits.Administrator)
		) {
			cache.isAdministrator = false
			cache.logger.log({
				title: `Administrator Permission Missing`,
				description: [
					`ADMINISTRATOR was removed from my list of permissions in <@&${oldRole.id}>`,
					"I need this role to operate properly, if not none of my commands will work."
				].join("\n"),
				color: Colors.Red
			})
		}

		if (
			oldRole.permissions.missing(PermissionFlagsBits.Administrator) &&
			newRole.permissions.has(PermissionFlagsBits.Administrator)
		) {
			cache.isAdministrator = true
			cache.logger.log({
				title: `Administrator Permission Restored`,
				description: [
					`ADMINISTRATOR was added to my list of permissions in <@&${oldRole.id}>`,
					"Thank you for restoring my permissions, now I can function properly"
				].join("\n"),
				color: Colors.Green
			})
		}
	}
}
