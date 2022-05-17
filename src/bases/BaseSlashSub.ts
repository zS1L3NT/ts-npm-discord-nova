import { BaseEntry, BaseGuildCache, iSlashData, SlashHelper } from "../"

export default abstract class BaseSlashSub<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract defer: boolean
	abstract ephemeral: boolean
	abstract data: iSlashData

	abstract execute: (helper: SlashHelper<E, GC>) => Promise<any>
}
