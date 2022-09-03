import { MessageOptions } from "discord.js"

import NovaBot from "./NovaBot"

export { default as BaseBotCache, iBaseBotCache } from "./bases/BaseBotCache"
export { default as BaseEntry } from "./bases/BaseEntry"
export { default as BaseGuildCache, iBaseGuildCache } from "./bases/BaseGuildCache"
export { default as HelpBuilder } from "./builders/HelpBuilder"
export { default as ResponseBuilder } from "./builders/ResponseBuilder"
export { default as SlashBuilder } from "./builders/SlashBuilder"
export { default as IsAdminMiddleware } from "./defaults/middleware/IsAdminMiddleware"
export { ButtonHelper, ButtonMiddleware, default as BaseButton } from "./interactions/button"
export {
	CommandHelper,
	CommandMiddleware,
	CommandType,
	default as BaseCommand
} from "./interactions/command"
export { default as BaseEvent, EventMiddleware } from "./interactions/event"
export { default as BaseModal, ModalHelper, ModalMiddleware } from "./interactions/modal"
export {
	default as BaseSelectMenu,
	SelectMenuHelper,
	SelectMenuMiddleware
} from "./interactions/selectMenu"
export * from "./NovaBot"
export { default as ChannelCleaner } from "./utils/ChannelCleaner"
export { default as DateHelper } from "./utils/DateHelper"
export { default as EventSetupHelper } from "./utils/EventSetupHelper"
export { default as FilesSetupHelper } from "./utils/FilesSetupHelper"
export { default as LogManager } from "./utils/LogManager"
export { default as SlashCommandDeployer } from "./utils/SlashCommandDeployer"

export type CommandPayload = Pick<MessageOptions, "embeds" | "components">

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
