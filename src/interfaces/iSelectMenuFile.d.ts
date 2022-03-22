import SelectMenuHelper from "../helpers/SelectMenuHelper"
import { BaseEntry, BaseGuildCache } from ".."

export default interface iSelectMenuFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: SelectMenuHelper<E, GC>) => Promise<any>
}
