import { Tracer } from "tracer"

declare global {
	var logger: (Tracer.Logger | Console) & {
		discord: (...args: any[]) => void | Tracer.LogOutput
	}
}

export {}
