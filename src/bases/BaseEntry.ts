export interface Alias {
	guild_id: string
	alias: string
	command: string
}

/**
 * Interface of a database entry which contains information about a Guild that should be saved past bot restarts.
 */
export default interface BaseEntry {
	prefix: string | null
	log_channel_id: string | null
}
