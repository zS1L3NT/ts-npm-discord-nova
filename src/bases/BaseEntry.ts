/**
 * Interface of a Firestore Entry which contains information about a Guild that should be saved past bot restarts.
 */
export default interface BaseEntry {
	prefix: string
	aliases: Record<string, string>
	log_channel_id: string
}
