declare global {
	// eslint-disable-next-line no-var
	var logger: {
		discord: (...args: any[]) => void
		info: (...args: any[]) => void
		warn: (...args: any[]) => void
		error: (...args: any[]) => void
	}
}

export {}
