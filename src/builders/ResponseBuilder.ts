import { EmbedBuilder } from "discord.js"

enum Emoji {
	GOOD = "https://res.cloudinary.com/zs1l3nt/image/upload/icons/check.png",
	BAD = "https://res.cloudinary.com/zs1l3nt/image/upload/icons/cross.png",
}

export default class ResponseBuilder {
	private constructor(
		/**
		 * The emoji to show on the embed
		 */
		public readonly emoji: Emoji,
		/**
		 * The message to show on the embed
		 */
		public readonly content: string,
	) {}

	/**
	 * Creates a ResponseBuilder with a green tick emoji
	 *
	 * @param content The message that the embed should show
	 * @returns ResponseBuilder
	 */
	static good(content: string) {
		return new ResponseBuilder(Emoji.GOOD, content)
	}

	/**
	 * Creates a ResponseBuilder with a red cross emoji
	 *
	 * @param content The message that the embed should show
	 * @returns ResponseBuilder
	 */
	static bad(content: string) {
		return new ResponseBuilder(Emoji.BAD, content)
	}

	/**
	 * Creates a EmbedBuilder with the data from the ResponseBuilder
	 *
	 * @returns EmbedBuilder with the content and emoji
	 */
	build() {
		return new EmbedBuilder()
			.setAuthor({ name: this.content, iconURL: this.emoji })
			.setColor(this.emoji === Emoji.GOOD ? "#77B255" : "#DD2E44")
	}
}
