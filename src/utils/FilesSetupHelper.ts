import { Collection } from "discord.js"
import fs from "fs"
import { useTry } from "no-try"
import path from "path"

import {
	BaseBotCache, BaseButton, BaseEntry, BaseEvent, BaseGuildCache, BaseSelectMenu, NovaOptions
} from "../"
import ButtonHelpMaximum from "../defaults/interactions/buttons/help-maximum"
import ButtonHelpMinimum from "../defaults/interactions/buttons/help-minimum"
import EventGuildCreate from "../defaults/interactions/events/guildCreate"
import EventGuildDelete from "../defaults/interactions/events/guildDelete"
import SelectMenuHelpItem from "../defaults/interactions/selectMenus/help-item"
import BaseCommand from "../interactions/command"

export default class FilesSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public readonly commandFiles = new Collection<string, BaseCommand<E, GC>>()
	public readonly buttonFiles = new Collection<string, BaseButton<E, GC>>()
	public readonly selectMenuFiles = new Collection<string, BaseSelectMenu<E, GC>>()
	public readonly eventFiles: BaseEvent<E, GC, BC, any>[] = []

	public constructor(public readonly options: NovaOptions<E, GC, BC>) {
		// this.slashFiles.set("help", new SlashHelp(this))
		this.buttonFiles.set("help-maximum", new ButtonHelpMaximum(this))
		this.buttonFiles.set("help-minimum", new ButtonHelpMinimum(this))
		this.selectMenuFiles.set("help-item", new SelectMenuHelpItem(this))
		// if (this.options.help.commandRegex) {
		// this.messageFiles.set("help-item", new MessageHelp(this))
		// }
		this.eventFiles.push(new EventGuildCreate(this), new EventGuildDelete<E, GC, BC>())

		this.setupCommands()
		this.setupButtons()
		this.setupSelectMenus()
		this.setupEvents()
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

	private setupCommands() {
		const fileNames = this.readEntities("commands")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<BaseCommand<E, GC>>(`commands/${fileName}`)
			this.commandFiles.set(name, file)
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

	private setupEvents() {
		const fileNames = this.readEntities("events")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<BaseEvent<E, GC, BC, any>>(`events/${fileName}`)
			this.eventFiles.push(file)
		}
	}
}
