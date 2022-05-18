import { MessageActionRow, MessageEmbed } from "discord.js"

declare type CommandPayload = {
	embeds: MessageEmbed[]
	components: MessageActionRow[]
}

declare interface iSlashData {
	name: string
	description: string
	options?: (iSlashDefaultOption | iSlashStringOption | iSlashNumberOption)[]
}

declare interface iSlashOption {
	name: string
	description: string
	requirements: string
	required: boolean
	default?: string
}

declare interface iSlashDefaultOption extends iSlashOption {
	type: "boolean" | "user" | "role" | "channel" | "mentionable"
}

declare interface iSlashStringOption extends iSlashOption {
	type: "string"
	choices?: {
		name: string
		value: string
	}[]
}

declare interface iSlashNumberOption extends iSlashOption {
	type: "number"
	choices?: {
		name: string
		value: number
	}[]
}
