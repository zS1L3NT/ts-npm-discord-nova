declare module NodeJS {
	interface ProcessEnv {
		readonly DATABASE_URL: string
		readonly DISCORD__TOKEN: string
		readonly DISCORD__BOT_ID: string
		readonly DISCORD__DEV_ID: string
	}
}
