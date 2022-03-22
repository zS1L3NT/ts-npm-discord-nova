import MessageHelper from "../helpers/MessageHelper"
import { BaseEntry, BaseGuildCache } from ".."

export default interface iMessageFile<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	condition: (helper: MessageHelper<E, GC>) => boolean
	execute: (helper: MessageHelper<E, GC>) => Promise<void>
}
