import { MessageActionRow, MessageEmbed } from "discord.js"

import NovaBot from "./NovaBot"

export { default as BaseBotCache, iBaseBotCache } from "./bases/BaseBotCache"
export { default as BaseEntry } from "./bases/BaseEntry"
export { default as BaseGuildCache, iBaseGuildCache } from "./bases/BaseGuildCache"

export { default as HelpBuilder } from "./builders/HelpBuilder"
export { default as ResponseBuilder } from "./builders/ResponseBuilder"
export { default as SlashBuilder } from "./builders/SlashBuilder"

export { default as BaseButton, ButtonMiddleware, ButtonHelper } from "./interactions/button"
export {
	default as BaseCommand,
	CommandMiddleware,
	CommandHelper,
	CommandType
} from "./interactions/command"
export { default as BaseEvent, EventMiddleware } from "./interactions/event"
export {
	default as BaseSelectMenu,
	SelectMenuMiddleware,
	SelectMenuHelper
} from "./interactions/selectMenu"

export { default as IsAdminMiddleware } from "./defaults/middleware/IsAdminMiddleware"

export { default as DateHelper } from "./utils/DateHelper"
export { default as ChannelCleaner } from "./utils/ChannelCleaner"
export { default as FilesSetupHelper } from "./utils/FilesSetupHelper"
export { default as EventSetupHelper } from "./utils/EventSetupHelper"
export { default as LogManager } from "./utils/LogManager"
export { default as SlashCommandDeployer } from "./utils/SlashCommandDeployer"

export * from "./NovaBot"

export type CommandPayload = {
	embeds?: MessageEmbed[]
	components?: MessageActionRow[]
}

export interface iSlashData {
	description: string
	options?: (iSlashDefaultOption | iSlashStringOption | iSlashNumberOption)[]
}

export interface iSlashOption {
	name: string
	description: string
	requirements: string
	required: boolean
	default?: string
}

export interface iSlashDefaultOption extends iSlashOption {
	type: "boolean" | "user" | "role" | "channel" | "mentionable"
}

export interface iSlashStringOption extends iSlashOption {
	type: "string"
	choices?: {
		name: string
		value: string
	}[]
}

export interface iSlashNumberOption extends iSlashOption {
	type: "number"
	choices?: {
		name: string
		value: number
	}[]
}

export default NovaBot
