import {
  Experiment,
  Experiments,
  PERSIST_KEY,
  SegmentEvent,
  Variant
} from './index'
import root from './window'
import analytics, { off, on, track } from './__mock__/analytics'
import random from './__mock__/random'
import { getItem, setItem } from './__mock__/localStorage'
import { getItem as getSessionItem } from './__mock__/sessionStorage'
import { addEventListener, removeEventListener } from './__mock__/window'
import { error } from './__mock__/console'

const SIGN_UP_EVENT = 'sign_up_event'

function createExperiments(storage: Storage = root.localStorage) {
  return new Experiments(
    {
      avatar_sign_up_test: new Experiment<string>({
        name: 'sign_up_vs_send',
        variants: [
          new Variant('sign_up', 0.5, 'Sign up'),
          new Variant('send', 0.5, 'Send')
        ],
        track(event: SegmentEvent<{}>, currentExperiment: Experiment<string>) {
          if (event.type === 'track' && event.name === SIGN_UP_EVENT) {
            currentExperiment.complete()
          }
        }
      }),
      fail_on_activation: new Experiment({
        name: 'failed_state',
        variants: [new Variant('variant', 1, 'Variant Value')],
        initialState() {
          throw new Error(`example error on initialState`)
        },
        track() {}
      }),
      fail_on_track: new Experiment({
        name: 'failed_track',
        variants: [new Variant('variant', 1, 'Variant Value')],
        track() {
          throw new Error(`example error on track`)
        }
      })
    },
    storage,
    analytics
  )
}

describe(`src/Experiments`, () => {
  describe(`constructor`, () => {
    test(`must load previous data from storage`, () => {
      createExperiments()
      expect(getItem.mock.calls.length).toEqual(1)
      expect(getItem.mock.calls[0]).toEqual([PERSIST_KEY])

      createExperiments(root.sessionStorage)
      expect(getSessionItem.mock.calls.length).toEqual(1)
      expect(getSessionItem.mock.calls[0]).toEqual([PERSIST_KEY])
    })
    test(`must log and should not fail if persisted data is invalid`, () => {
      getItem.mockReturnValueOnce('-')
      createExperiments()
      expect(getItem.mock.calls.length).toEqual(1)
      expect(getItem.mock.calls[0]).toEqual([PERSIST_KEY])
      expect(error.mock.calls.length).toEqual(1)
      expect(error.mock.calls[0]).toEqual([
        'Persisted experiments cannot be loaded: ',
        new SyntaxError('Unexpected end of JSON input'),
        '-'
      ])
    })
    test(`must listen for analytics event`, () => {
      const experiments = createExperiments()
      expect(on.mock.calls.length).toEqual(1)
      expect(on.mock.calls[0]).toEqual(['track', experiments.handleTrackEvent])
    })
    test(`must listen for storage event`, () => {
      const experiments = createExperiments()
      expect(addEventListener.mock.calls.length).toEqual(1)
      expect(addEventListener.mock.calls[0]).toEqual([
        'storage',
        experiments.handleStorageChange
      ])
    })
  })
  describe(`.emit()`, () => {
    test(``, () => {})
  })
  describe(`.detach()`, () => {
    test(`must remove all analytics event`, () => {
      const experiments = createExperiments()
      experiments.detach()
      expect(off.mock.calls.length).toEqual(1)
      expect(off.mock.calls[0]).toEqual(['track', experiments.handleTrackEvent])
    })
    test(`must remove all storage event`, () => {
      const experiments = createExperiments()
      experiments.detach()
      expect(removeEventListener.mock.calls.length).toEqual(1)
      expect(removeEventListener.mock.calls[0]).toEqual([
        'storage',
        experiments.handleStorageChange
      ])
    })
  })
  describe(`.getCurrentValueFor()`, () => {
    test(`must return default value if the experiment not exists`, () => {
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'missing_experiment',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()
      expect(value).toEqual('Default Value')
    })
    test(`must return one of the variants values`, () => {
      random.mockReturnValueOnce(0.2)
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()
      expect(value).toEqual('Sign up')
    })
    test(`must persist the result in the storage`, () => {
      random.mockReturnValueOnce(0.7)
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()

      expect(value).toEqual('Send')
      expect(setItem.mock.calls.length).toEqual(1)
      expect(setItem.mock.calls[0]).toEqual([
        PERSIST_KEY,
        '[["sign_up_vs_send","send"]]'
      ])
    })
    test(`must return the same value`, () => {
      random.mockReturnValueOnce(0.7)
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()
      expect(value).toEqual('Send')

      const value2 = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()
      expect(value2).toEqual('Send')
    })
    test(`must load and return previous persisted values`, () => {
      getItem.mockReturnValueOnce('[["sign_up_vs_send","send"]]')
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()
      expect(value).toEqual('Send')
    })
    test(`must update variants if storage change`, () => {
      const experiments = createExperiments()

      // broadcast storage change
      getItem.mockReturnValueOnce('[["sign_up_vs_send","send"]]')
      // simulated broadcast current change
      experiments.handleStorageChange()

      const value = experiments.getCurrentValueFor(
        'avatar_sign_up_test',
        'Default Value'
      )
      // simulated broadcast current change
      experiments.handleStorageChange()

      expect(value).toEqual('Send')
      expect(setItem.mock.calls.length).toEqual(0)
    })
    test(`must track the experiment_show event when value is activated for first time`, () => {
      const experiments = createExperiments()

      experiments.getCurrentValueFor('avatar_sign_up_test', 'Default Value')
      // simulated broadcast current change
      experiments.handleStorageChange()

      expect(track.mock.calls.length).toEqual(1)
      expect(track.mock.calls[0]).toEqual([
        'experiment_show',
        { experiment: 'sign_up_vs_send', variation: 'sign_up' }
      ])

      experiments.getCurrentValueFor('avatar_sign_up_test', 'Default Value')
      expect(track.mock.calls.length).toEqual(1)
    })
    test(`must complete experiment and should not track events if activation fail`, () => {
      const experiments = createExperiments()
      const value = experiments.getCurrentValueFor(
        'fail_on_activation',
        'Default Value'
      )

      expect(value).toEqual('Default Value')
      expect(track.mock.calls.length).toEqual(0)
      expect(error.mock.calls.length).toEqual(1)
      expect(error.mock.calls[0]).toEqual([
        'Error executing activate method of "failed_state": ',
        new Error('example error on initialState'),
        experiments.getExperiment('fail_on_activation')
      ])
    })
    test(`must track the experiment_conversion event when the experiment is completed`, () => {
      const experiments = createExperiments()

      experiments.getCurrentValueFor('avatar_sign_up_test', 'Default Value')
      // simulated broadcast current change
      experiments.handleStorageChange()

      expect(track.mock.calls.length).toEqual(1)
      expect(track.mock.calls[0]).toEqual([
        'experiment_show',
        { experiment: 'sign_up_vs_send', variation: 'sign_up' }
      ])

      experiments.handleTrackEvent(SIGN_UP_EVENT, {})
      expect(track.mock.calls.length).toEqual(2)
      expect(track.mock.calls[1]).toEqual([
        'experiment_conversion',
        { experiment: 'sign_up_vs_send', variation: 'sign_up' }
      ])
    })
    test(`must complete the experiment and track the experiment_conversion event when the experiment fail on track`, () => {
      const experiments = createExperiments()

      experiments.getCurrentValueFor('fail_on_track', 'Default Value')
      // simulated broadcast current change
      experiments.handleStorageChange()

      const experiment = experiments.getExperiment('fail_on_track')
      expect(experiment).toBeTruthy()
      expect(experiment && experiment.isActive()).toBe(false)
      expect(experiment && experiment.isCompleted()).toBe(true)
      expect(track.mock.calls.length).toEqual(2)
      expect(track.mock.calls[0]).toEqual([
        'experiment_show',
        { experiment: 'failed_track', variation: 'variant' }
      ])
      expect(track.mock.calls[1]).toEqual([
        'experiment_conversion',
        {
          experiment: 'failed_track',
          variation: 'variant',
          error_message: 'example error on track'
        }
      ])

      experiments.handleTrackEvent(SIGN_UP_EVENT, {})
      expect(track.mock.calls.length).toEqual(2)
    })
  })
  describe(`.getAllValuesFor()`, () => {
    test(`must return all values for an experiment`, () => {
      const experiments = createExperiments()
      expect(experiments.getAllValuesFor('avatar_sign_up_test')).toEqual([
        'Sign up',
        'Send'
      ])
    })
    test(`must return an empty array if the experiment not exists`, () => {
      const experiments = createExperiments()
      expect(experiments.getAllValuesFor('missing_test')).toEqual([])
    })
  })
})
