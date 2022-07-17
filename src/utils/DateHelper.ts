import { DateTime } from "luxon"

export default class DateHelper {
	static readonly daysOfWeek: {
		[day: string]: string
	} = {
		Mon: "Monday",
		Tue: "Tuesday",
		Wed: "Wednesday",
		Thu: "Thursday",
		Fri: "Friday",
		Sat: "Saturday",
		Sun: "Sunday"
	}
	static nameOfMonths = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	]
	static readonly longerMonths = [0, 2, 4, 6, 7, 9, 11]

	constructor(private readonly time: number) {}

	static verify(day: number, month: number, year: number, hour: number, minute: number) {
		const now = DateTime.now()

		if (this.longerMonths.includes(month)) {
			if (day > 31) {
				throw new Error(`This month cannot have ${day} days`)
			}
		} else {
			if (day > 30) {
				throw new Error(`This month cannot have ${day} days`)
			}
		}

		if (month === 1) {
			if (year % 4 !== 0 && day === 29) {
				throw new Error(`February cannot have 29 days in a non-leap year`)
			}
			if (day > 29) {
				throw new Error(`February cannot have ${day} days`)
			}
		}

		if (year < now.year) {
			throw new Error("Year must not be in the past")
		}
		if (year - now.year > 5) {
			throw new Error("Year must not be more than 5 years ahead")
		}

		if (hour > 23) {
			throw new Error("Hour must not exceed 23")
		}

		if (minute > 59) {
			throw new Error("Minute must not exceed 59")
		}

		return DateTime.fromObject(
			{
				year,
				month: month + 1,
				day,
				hour,
				minute
			},
			{ zone: "Asia/Singapore" }
		)
	}

	getTimeLeft() {
		const ms = this.time - Date.now() + 30000

		if (ms < 1000) {
			return "NOW"
		}

		const s = Math.floor(ms / 1000)
		if (s < 60) {
			return "Less than 1m"
		}

		const m = Math.floor(s / 60)
		if (m < 60) {
			return m + "m"
		}

		const h = Math.floor(m / 60)
		const mr = m % 60
		if (h < 24) {
			return h + "h " + mr + "m"
		}

		const d = Math.floor(h / 24)
		const hr = h % 24
		if (d < 7) {
			return d + "d " + hr + "h " + mr + "m"
		}

		const w = Math.floor(d / 7)
		const dr = d % 7
		return w + "w " + dr + "d " + hr + "h " + mr + "m"
	}

	getDate() {
		const date = DateTime.fromMillis(this.time).setZone("Asia/Singapore")
		return date.toFormat("cccc, dd LLLL yyyy 'at' t")
	}
}
