export default class Variant<Value> {
  constructor(
    public readonly name: string,
    public readonly ratio: number,
    public readonly value: Value
  ) {}
}

export const EmptyVariant = new Variant('__undefined__', 1, undefined)
