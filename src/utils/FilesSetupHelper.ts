import { Collection } from "discord.js"
import fs from "fs"
import { useTry } from "no-try"
import path from "path"

import { SlashCommandBuilder } from "@discordjs/builders"

import {
	BaseBotCache, BaseButton, BaseEntry, BaseEvent, BaseGuildCache, BaseMessage, BaseSelectMenu,
	BaseSlash, BaseSlashSub, iSlashFolder, NovaOptions
} from "../"
import SlashBuilder from "../builders/SlashBuilder"
import ButtonHelpMaximum from "../interactions/defaults/buttons/help-maximum"
import ButtonHelpMinimum from "../interactions/defaults/buttons/help-minimum"
import EventGuildCreate from "../interactions/defaults/events/guildCreate"
import EventGuildDelete from "../interactions/defaults/events/guildDelete"
import MessageHelp from "../interactions/defaults/messages/help"
import SelectMenuHelpItem from "../interactions/defaults/selectMenus/help-item"
import SlashHelp from "../interactions/defaults/slashs/help"
import SlashSetAlias from "../interactions/defaults/slashs/set/alias"

export default class FilesSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public readonly slashFiles = new Collection<string, BaseSlash<E, GC> | iSlashFolder<E, GC>>()
	public readonly buttonFiles = new Collection<string, BaseButton<E, GC>>()
	public readonly selectMenuFiles = new Collection<string, BaseSelectMenu<E, GC>>()
	public readonly messageFiles = new Collection<string, BaseMessage<E, GC>>()
	public readonly eventFiles: BaseEvent<E, GC, BC, any>[] = []

	public constructor(public readonly options: NovaOptions<E, GC, BC>) {
		this.slashFiles.set("help", new SlashHelp(this))
		this.buttonFiles.set("help-maximum", new ButtonHelpMaximum(this))
		this.buttonFiles.set("help-minimum", new ButtonHelpMinimum(this))
		this.selectMenuFiles.set("help-item", new SelectMenuHelpItem(this))
		if (this.options.help.commandRegex) {
			this.messageFiles.set("help-item", new MessageHelp(this))
		}
		this.eventFiles.push(new EventGuildCreate(this), new EventGuildDelete<E, GC, BC>())

		this.setupSlashs()
		this.setupButtons()
		this.setupSelectMenus()
		this.setupMessages()
		this.setupEvents()
	}

	private isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private readEntities(name: string): string[] | null {
		const [err, files] = useTry(() => fs.readdirSync(path.join(this.options.directory, name)))
		if (err) return null
		return files
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.options.directory, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
		}
	}

	private setupSlashs() {
		const entityNames = this.readEntities("slashs")
		if (entityNames === null) return

		const messageCommands = this.readEntities("messages")
		const setAliasFile = messageCommands
			? messageCommands.length > 0
				? new SlashSetAlias(messageCommands)
				: null
			: null

		// Slash subcommands
		const folderNames = entityNames.filter(f => !this.isFile(f))
		for (const folderName of folderNames) {
			const files = new Collection<string, BaseSlashSub<E, GC>>()
			const fileNames = this.readEntities(`slashs/${folderName}`)!
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			if (folderName === "set" && setAliasFile) {
				files.set("alias", setAliasFile)
				builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())
			}

			for (const fileName of fileNames) {
				const file = this.require<BaseSlashSub<E, GC>>(`slashs/${folderName}/${fileName}`)
				files.set(file.data.name, file)
				builder.addSubcommand(new SlashBuilder(file.data).buildSubcommand())
			}

			this.slashFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entityNames.filter(f => this.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<BaseSlash<E, GC>>(`slashs/${filename}`)
			this.slashFiles.set(file.data.name, file)
		}

		if (!this.slashFiles.get("set") && setAliasFile) {
			const files = new Collection<string, BaseSlashSub<E, GC>>()
			const builder = new SlashCommandBuilder()
				.setName("set")
				.setDescription(`Commands for set`)

			files.set("alias", setAliasFile)
			builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())

			this.slashFiles.set("set", {
				data: builder,
				files
			})
		}
	}

	private setupButtons() {
		const fileNames = this.readEntities("buttons")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<BaseButton<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, file)
		}
	}

	private setupSelectMenus() {
		const fileNames = this.readEntities("selectMenus")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<BaseSelectMenu<E, GC>>(`selectMenus/${fileName}`)
			this.selectMenuFiles.set(name, file)
		}
	}

	private setupMessages() {
		const fileNames = this.readEntities("messages")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<BaseMessage<E, GC>>(`messages/${fileName}`)
			this.messageFiles.set(fileName.split(".ts").at(0)!, file)
		}
	}

	private setupEvents() {
		const fileNames = this.readEntities("events")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<BaseEvent<E, GC, BC, any>>(`events/${fileName}`)
			this.eventFiles.push(file)
		}
	}
}
