import window from './window'
import Experiment from './Experiment'
import { SegmentEvent } from './types'
import { EmptyVariant } from './Variant'

export interface ExperimentMap {
  [experimentId: string]: Experiment<any>
}

export type PersistedVariant = [string, string][]

export const PERSIST_KEY = 'dcl_experiments'

export default class Experiments {
  /**
   * Semaphore to handle localStorage or sessionStorage changes
   */
  private localStorageChange: boolean = false

  /**
   * list of active experiments
   */
  private activeExperiments: Set<Experiment<any>> = new Set()

  /**
   * previous resolved variants
   */
  private variantForExperiments: Map<string, any> = new Map()

  /**
   * @param experiments - list of experiment running
   * @param storage - to persist the same result for the user
   * @param analytics - segment api
   */
  constructor(
    private experiments: ExperimentMap,
    private storage: Storage = window.localStorage,
    private _analytics: SegmentAnalytics.AnalyticsJS | null | undefined
  ) {
    if (this.analytics) {
      this.analytics.on('track', this.handleTrackEvent)
    } else {
      console.warn(
        `Analytics is not present in the project, experiments framework will not generate any report. Follow this guide to include it: https://segment.com/docs/sources/website/analytics.js/quickstart/`
      )
    }

    this.loadPersisted()
    if (this.isBrowserStorage()) {
      window.addEventListener('storage', this.handleStorageChange)
    }
  }

  get analytics() {
    return this._analytics || window.analytics || null
  }

  /**
   * Persist methods
   */
  persist() {
    if (this.isBrowserStorage()) {
      this.localStorageChange = true
    }
    const entries = Array.from(this.variantForExperiments.entries())
    this.storage.setItem(PERSIST_KEY, JSON.stringify(entries))
  }

  persistVariant(experimentName: string, variantName: string) {
    if (this.variantForExperiments.get(experimentName) !== variantName) {
      this.variantForExperiments.set(experimentName, variantName)
      this.persist()
    }
  }

  loadPersisted() {
    const persisted = this.storage.getItem(PERSIST_KEY)
    if (persisted) {
      try {
        const entries = JSON.parse(persisted)
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (Array.isArray(entry) && entry.length === 2) {
              const [key, value] = entry
              this.variantForExperiments.set(key, value)
            }
          }
        }
      } catch (err) {
        console.error(
          `Persisted experiments cannot be loaded: `,
          err,
          persisted
        )
      }
    }
  }

  isBrowserStorage() {
    return (
      this.storage === window.localStorage ||
      this.storage === window.sessionStorage
    )
  }

  handleStorageChange = () => {
    if (this.localStorageChange) {
      this.localStorageChange = false
    } else {
      this.loadPersisted()
    }
  }

  /**
   * Event tracking methods
   */
  emit(event: SegmentEvent) {
    if (this.activeExperiments.size > 0) {
      for (const experiment of this.activeExperiments.values()) {
        try {
          // Execute track safely
          experiment.track(event)
        } catch (err) {
          experiment.setState({
            error_message: err.message
          })
          experiment.complete()
          console.error(
            `Error executing track method of "${experiment.name}": `,
            err,
            experiment
          )
        }

        this.checkCompleteExperiment(experiment)
      }
    }
  }

  handleTrackEvent = (name: string, properties: any = {}) => {
    this.emit({ type: 'track', name, properties })
  }

  // handlePageEvent = (name: string, properties: any) => {
  //   this.emit('page', name, properties)
  // }

  // handleIdentifyEvent = (name: string, properties: any) => {
  //   this.emit('identify', name, properties)
  // }

  /**
   * report experiment methods
   */
  activateExperiment(experiment: Experiment<any>) {
    const persistedVariant = this.variantForExperiments.get(experiment.name)

    try {
      // Execute activate safely
      experiment.activate(persistedVariant)
    } catch (err) {
      experiment.complete()
      console.error(
        `Error executing activate method of "${experiment.name}": `,
        err,
        experiment
      )
    }

    if (experiment.isActive()) {
      this.persistVariant(experiment.name, experiment.variant.name)
      this.activeExperiments.add(experiment)
      if (this.analytics && experiment.variant !== EmptyVariant) {
        this.analytics.track('experiment_show', {
          experiment: experiment.name,
          variation: experiment.variant.name
        })
      }
    }
  }

  checkCompleteExperiment(experiment: Experiment<any>) {
    if (experiment.isCompleted()) {
      this.activeExperiments.delete(experiment)

      if (this.analytics) {
        const experimentState = experiment.state
        this.analytics.track('experiment_conversion', {
          experiment: experiment.name,
          variation: experiment.variant.name,
          ...experimentState
        })
      }
    }
  }

  /**
   * return instance of a experiment by id
   */
  getExperiment<Value, State extends {} = {}, EventProps extends {} = {}>(
    experimentId: string
  ): Experiment<Value, State, EventProps> | undefined {
    return this.experiments && (this.experiments[experimentId] as any)
  }

  /**
   * if there are any experiment active for `experimentId` return the testing value
   * otherwise return `defaultValue`
   */
  getCurrentValueFor<Value>(experimentId: string, defaultValue: Value): Value {
    if (this.experiments && this.experiments[experimentId]) {
      const experiment: Experiment<Value> = this.experiments[experimentId]

      if (!experiment.isActive()) {
        this.activateExperiment(experiment)
      }

      if (experiment.value !== undefined) {
        return experiment.value
      }
    }

    return defaultValue
  }

  /**
   * return an array with all values available for `experimentId`
   */
  getAllValuesFor<Value>(experimentId: string): Value[] {
    if (this.experiments && this.experiments[experimentId]) {
      const experiment: Experiment<Value> = this.experiments[experimentId]
      return experiment
        .getAllVariants()
        .map(variant => variant.value)
        .filter(value => value !== undefined)
    }

    return []
  }

  /**
   * detach all experiments from segment events
   */
  detach() {
    const analytics = this.analytics as any
    if (analytics) {
      analytics.off('track', this.handleTrackEvent)
    }

    if (this.isBrowserStorage()) {
      window.removeEventListener('storage', this.handleStorageChange)
    }
  }
}
