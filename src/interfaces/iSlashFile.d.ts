import SlashHelper from "../helpers/SlashHelper"
import { BaseEntry, BaseGuildCache, iSlashData } from ".."

export default interface iSlashFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	data: iSlashData
	execute: (helper: SlashHelper<E, GC>) => Promise<any>
}
