import { MessageEmbed } from "discord.js"

enum Emoji {
	GOOD = "https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/good.png?alt=media&token=4b833fc2-b8ff-4d5c-add2-f5a6029664fb",
	BAD = "https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/bad.png?alt=media&token=cbd48c77-784c-4f86-8de1-7335b452a894"
}

export default class ResponseBuilder {
	private constructor(public readonly emoji: Emoji, private readonly content: string) {}

	static good(content: string) {
		return new ResponseBuilder(Emoji.GOOD, content)
	}

	static bad(content: string) {
		return new ResponseBuilder(Emoji.BAD, content)
	}

	build() {
		return new MessageEmbed()
			.setAuthor({ name: this.content, iconURL: this.emoji })
			.setColor(this.emoji === Emoji.GOOD ? "#77B255" : "#DD2E44")
	}
}
