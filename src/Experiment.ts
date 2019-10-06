import Variant, { EmptyVariant } from './Variant'
import { SegmentEvent } from './types'

/**
 *
 */
export type ExperimentTracker<Value, EventProps extends {} = {}> = (
  event: SegmentEvent<EventProps>,
  currentExperiment: Experiment<Value>
) => void

/**
 *
 */
export interface ExperimentOptions<
  Value,
  State extends {} = {},
  EventProps extends {} = {}
> {
  /**
   * name reported to segment
   */
  name: string

  /**
   * list of values available for the experiment
   */
  variants: Array<Variant<Value>>

  /**
   * initial state for the experiment
   */
  initialState?: () => State

  /**
   * this function will be call on each segment event allowing to modify
   * the experiment's state using `currentExperiment.setState({ ... })`
   * and complete the experiment using `currentExperiment.complete()`
   */
  track: ExperimentTracker<Value, EventProps>
}

/**
 *
 */
export default class Experiment<
  Value,
  State extends {} = {},
  EventProps extends {} = {}
> {
  private completed: boolean = false
  private active: boolean = false
  private activeVariant: Variant<Value | undefined> | undefined = undefined

  constructor(private options: ExperimentOptions<Value, State, EventProps>) {}

  /**
   * Name of the current Experiment
   */
  get name() {
    return this.options.name
  }

  /**
   * Value of the current variation
   */
  get value(): Value | undefined {
    return this.activeVariant && this.activeVariant.value
  }

  /**
   *
   */
  get variant(): Variant<Value | undefined> {
    return this.activeVariant || EmptyVariant
  }

  /**
   * Experiment state, allow to collect extra data
   */
  state: State

  /**
   * Finish the test, marks it as completed and dispatch
   * the `experiment_conversion` event with the final state to segment
   */
  complete(): void {
    this.active = false
    this.completed = true
  }

  /**
   * Activate the current experiment
   */
  activate(forceVariant?: string): void {
    if (!this.isActive() && !this.isCompleted()) {
      this.state =
        typeof this.options.initialState === 'function'
          ? this.options.initialState()
          : ({} as State)
      let variant: Variant<Value | undefined> | undefined
      if (forceVariant) {
        variant = this.getVariant(forceVariant)
      }

      if (variant === undefined) {
        variant = this.getRandomVariant()
      }

      this.active = true
      this.activeVariant = variant
    }
  }

  /**
   * Random return a varia`nt
   */
  getRandomVariant(): Variant<Value | undefined> {
    if (
      Array.isArray(this.options.variants) &&
      this.options.variants.length > 0
    ) {
      let offset = 0
      const random = Math.random()
      for (const variant of this.options.variants) {
        if (random < variant.ratio + offset) {
          return variant
        } else {
          offset += variant.ratio
        }
      }
    }

    return EmptyVariant
  }

  getVariant(name: string): Variant<Value | undefined> | undefined {
    if (name === EmptyVariant.name || !Array.isArray(this.options.variants)) {
      return EmptyVariant
    }

    return this.options.variants.find(current => current.name === name)
  }

  /**
   * Return all available values
   */
  getAllVariants(): Variant<Value>[] {
    if (!Array.isArray(this.options.variants)) {
      return []
    }
    return this.options.variants.slice()
  }

  /**
   * Modify de state using `Object.assign`
   */
  setState(patchState: Partial<State>): void {
    if (patchState && this.isActive() && !this.isCompleted()) {
      this.state = Object.assign({}, this.state, patchState)
    }
  }

  /**
   * Return if the experiment is completed
   */
  isCompleted() {
    return this.completed
  }

  /**
   * Return if the experiment is active
   */
  isActive() {
    return this.active
  }

  /**
   * Execute the tracker
   */
  track(segmentEvent: SegmentEvent<EventProps>) {
    if (this.isActive() && !this.isCompleted()) {
      this.options.track(segmentEvent, this)
    }
  }
}
