export default interface BaseEntry {
	prefix: string
	aliases: Record<string, string>
	log_channel_id: string
}
