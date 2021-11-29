export interface iBaseValue {}

export type iBaseDocument<V extends iBaseValue, R extends BaseDocument<V, R>> = new (value?: V) => R

export default abstract class BaseDocument<V extends iBaseValue, E> {
	public readonly value: V

	public constructor(value?: V) {
		this.value = value!
	}

	public abstract getEmpty(): E
}
