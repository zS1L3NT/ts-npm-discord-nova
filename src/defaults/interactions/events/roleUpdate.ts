import { Role } from "discord.js"

import { BaseBotCache, BaseEntry, BaseEvent, BaseGuildCache, FilesSetupHelper } from "../../.."

export default class<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseEvent<E, GC, BC, "roleUpdate"> {
	override name = "roleUpdate" as const

	override middleware = []

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(botCache: BC, oldRole: Role, newRole: Role) {
		if (!oldRole.managed) return
		const member = oldRole.members.find(m => m.user.id === botCache.bot.user!.id)
		if (!member) return
		const cache = await botCache.getGuildCache(member.guild)

		if (
			oldRole.permissions.has("ADMINISTRATOR") &&
			newRole.permissions.missing("ADMINISTRATOR")
		) {
			cache.isAdministrator = false
			cache.logger.log({
				title: `Administrator Permission Missing`,
				description: [
					`ADMINISTRATOR was removed from my list of permissions in <@&${oldRole.id}>`,
					"I need this role to operate properly, if not none of my commands will work."
				].join("\n"),
				color: "RED"
			})
		}

		if (
			oldRole.permissions.missing("ADMINISTRATOR") &&
			newRole.permissions.has("ADMINISTRATOR")
		) {
			cache.isAdministrator = true
			cache.logger.log({
				title: `Administrator Permission Restored`,
				description: [
					`ADMINISTRATOR was added to my list of permissions in <@&${oldRole.id}>`,
					"Thank you for restoring my permissions, now I can function properly"
				].join("\n"),
				color: "GREEN"
			})
		}
	}
}
