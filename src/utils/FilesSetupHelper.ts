import { Collection } from "discord.js"
import fs from "fs"
import { useTry } from "no-try"
import path from "path"

import {
	BaseBotCache, BaseButton, BaseCommand, BaseEntry, BaseEvent, BaseGuildCache, BaseModal,
	BaseSelectMenu
} from "../"
import ButtonHelpMaximum from "../defaults/interactions/buttons/help-maximum"
import ButtonHelpMinimum from "../defaults/interactions/buttons/help-minimum"
import CommandHelp from "../defaults/interactions/commands/help"
import CommandSetAlias from "../defaults/interactions/commands/set-alias"
import CommandSetLogChannel from "../defaults/interactions/commands/set-log-channel"
import CommandSetPrefix from "../defaults/interactions/commands/set-prefix"
import EventGuildCreate from "../defaults/interactions/events/guildCreate"
import EventGuildDelete from "../defaults/interactions/events/guildDelete"
import EventRoleUpdate from "../defaults/interactions/events/roleUpdate"
import SelectMenuHelpItem from "../defaults/interactions/selectMenus/help-item"

export default class FilesSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	readonly commandFiles = new Collection<string, BaseCommand<E, GC>>()
	readonly buttonFiles = new Collection<string, BaseButton<E, GC>>()
	readonly selectMenuFiles = new Collection<string, BaseSelectMenu<E, GC>>()
	readonly modalFiles = new Collection<string, BaseModal<E, GC>>()
	readonly eventFiles: BaseEvent<E, GC, BC, any>[] = []

	constructor(
		public readonly directory: string,
		public readonly icon: string,
		public readonly helpMessage: (cache: GC) => string
	) {
		this.commandFiles.set("help", new CommandHelp(this))
		this.commandFiles.set("set-alias", new CommandSetAlias(this.readEntities("messages") ?? []))
		this.commandFiles.set("set-log-channel", new CommandSetLogChannel())
		this.commandFiles.set("set-prefix", new CommandSetPrefix())
		this.buttonFiles.set("help-maximum", new ButtonHelpMaximum(this))
		this.buttonFiles.set("help-minimum", new ButtonHelpMinimum(this))
		this.selectMenuFiles.set("help-item", new SelectMenuHelpItem(this))
		this.eventFiles.push(
			new EventGuildCreate(this),
			new EventGuildDelete<E, GC, BC>(),
			new EventRoleUpdate<E, GC, BC>()
		)

		this.setupCommands()
		this.setupButtons()
		this.setupSelectMenus()
		this.setupModals()
		this.setupEvents()
	}

	private readEntities(name: string) {
		const [err, files] = useTry(() => fs.readdirSync(path.join(this.directory, name)))
		if (err) return null
		return files
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.directory, location))
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
			const Command = this.require<new () => BaseCommand<E, GC>>(`commands/${fileName}`)
			this.commandFiles.set(name, new Command())
		}
	}

	private setupButtons() {
		const fileNames = this.readEntities("buttons")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const Button = this.require<new () => BaseButton<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, new Button())
		}
	}

	private setupSelectMenus() {
		const fileNames = this.readEntities("selectMenus")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const SelectMenu = this.require<new () => BaseSelectMenu<E, GC>>(
				`selectMenus/${fileName}`
			)
			this.selectMenuFiles.set(name, new SelectMenu())
		}
	}

	private setupModals() {
		const fileNames = this.readEntities("modals")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const Modal = this.require<new () => BaseModal<E, GC>>(`modals/${fileName}`)
			this.modalFiles.set(name, new Modal())
		}
	}

	private setupEvents() {
		const fileNames = this.readEntities("events")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const Event = this.require<new () => BaseEvent<E, GC, BC, any>>(`events/${fileName}`)
			this.eventFiles.push(new Event())
		}
	}
}
