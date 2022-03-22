import ButtonHelper from "../helpers/ButtonHelper"
import { BaseEntry, BaseGuildCache } from ".."

export default interface iButtonFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	defer: boolean
	ephemeral: boolean
	execute: (helper: ButtonHelper<E, GC>) => Promise<any>
}
