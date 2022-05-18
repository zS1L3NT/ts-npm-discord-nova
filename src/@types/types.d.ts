import { Collection, MessageActionRow, MessageEmbed } from "discord.js"

import { SlashCommandBuilder } from "@discordjs/builders"

import { BaseEntry, BaseGuildCache, BaseSlashSub } from "../"

declare type CommandPayload = {
	embed: MessageEmbed[]
	components: MessageActionRow[]
}

declare interface iSlashFolder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	data: SlashCommandBuilder
	files: Collection<string, BaseSlashSub<E, GC>>
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
