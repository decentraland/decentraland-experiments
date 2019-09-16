import { EmptyVariant, Experiment, SegmentEvent, Variant } from './index'
import random from './__mock__/random'

describe(`src/Experiment`, () => {
  describe(`.activate()`, () => {
    test(`must setup experiment as active and add state, value and variant`, () => {
      random.mockReturnValueOnce(0.2)
      const variant = new Variant('experiment_variant', 1, 234)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        track() {}
      })

      expect(experiment.name).toBe('experiment_test')
      expect(experiment.state).toBeUndefined()
      expect(experiment.value).toBeUndefined()
      expect(experiment.variant).toBe(EmptyVariant)
      expect(experiment.isActive()).toBe(false)
      expect(experiment.isCompleted()).toBe(false)

      experiment.activate()

      expect(experiment.state).toEqual({})
      expect(experiment.value).toBe(234)
      expect(experiment.variant).toBe(variant)
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)
    })

    test(`must select one of the variants`, () => {
      random.mockReturnValueOnce(0.2)
      const variant1 = new Variant('experiment_variant_1', 0.5, 12)
      const variant2 = new Variant('experiment_variant_2', 0.5, 34)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant1, variant2],
        track() {}
      })

      experiment.activate()
      expect(experiment.state).toEqual({})
      expect(experiment.value).toBe(variant1.value)
      expect(experiment.variant).toBe(variant1)
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)
    })

    test(`must select a variant by name`, () => {
      // random.mockReturnValueOnce(0.2)
      const variantExpected = new Variant(
        'experiment_variant_expected',
        0.000000000001,
        999
      )
      const variant1 = new Variant('experiment_variant_1', 0.33, 12)
      const variant2 = new Variant('experiment_variant_2', 0.33, 34)
      const variant3 = new Variant('experiment_variant_3', 0.34, 34)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variantExpected, variant1, variant2, variant3],
        track() {}
      })

      experiment.activate('experiment_variant_expected')
      expect(random.mock.calls).toEqual([]) // random wasn't call
      expect(experiment.state).toEqual({})
      expect(experiment.value).toBe(variantExpected.value)
      expect(experiment.variant).toBe(variantExpected)
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)
    })

    test(`must select a variant randomly`, () => {
      random.mockReturnValueOnce(0.3).mockReturnValueOnce(0.6)
      const variant1 = new Variant('experiment_variant_1', 0.5, 12)
      const variant2 = new Variant('experiment_variant_2', 0.5, 34)

      const experiment1 = new Experiment({
        name: 'experiment_test_1',
        variants: [variant1, variant2],
        track() {}
      })

      const experiment2 = new Experiment({
        name: 'experiment_test_2',
        variants: [variant1, variant2],
        track() {}
      })

      experiment1.activate()
      expect(experiment1.state).toEqual({})
      expect(experiment1.value).toBe(variant1.value)
      expect(experiment1.variant).toBe(variant1)
      expect(experiment1.isActive()).toBe(true)
      expect(experiment1.isCompleted()).toBe(false)

      experiment2.activate()
      expect(experiment2.state).toEqual({})
      expect(experiment2.value).toBe(variant2.value)
      expect(experiment2.variant).toBe(variant2)
      expect(experiment2.isActive()).toBe(true)
      expect(experiment2.isCompleted()).toBe(false)
    })
    test(`If the sum of ratios is less than 1 the "empty variant" could be selected`, () => {
      random.mockReturnValueOnce(0.6)
      const variant = new Variant('variant', 0.1, 999)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        track() {}
      })

      experiment.activate()
      expect(experiment.state).toEqual({})
      expect(experiment.value).toBe(EmptyVariant.value)
      expect(experiment.variant).toBe(EmptyVariant)
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)
    })
    test(`the EmptyVariant can be force selected`, () => {
      const variant = new Variant('variant', 0.999999999, 999)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        track() {}
      })

      experiment.activate(EmptyVariant.name)
      expect(experiment.state).toEqual({})
      expect(experiment.value).toBe(EmptyVariant.value)
      expect(experiment.variant).toBe(EmptyVariant)
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)
    })
  })
  describe(`.setState()`, () => {
    test(`the state must be undefined if the experiment is not active`, () => {
      const variant = new Variant('experiment_variant', 1, 234)
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        track() {}
      })

      expect(experiment.state).toBeUndefined()
      experiment.activate()
      expect(experiment.state).toEqual({})
    })

    test(`the state can be initialized with initialState props`, () => {
      const variant = new Variant('experiment_variant', 1, 234)
      const value = Math.random()
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        initialState() {
          return { value }
        },
        track() {}
      })

      expect(experiment.state).toBeUndefined()
      experiment.activate()
      expect(experiment.state.value).toEqual(value)
    })

    test(`the state can be modified after activation of the experiment`, () => {
      const variant = new Variant('experiment_variant', 1, 234)
      const value = Math.random()
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        initialState() {
          return { value }
        },
        track() {}
      })

      expect(experiment.state).toBeUndefined()
      experiment.setState({ value: 1 })
      expect(experiment.state).toBeUndefined()

      experiment.activate()
      expect(experiment.state.value).toEqual(value)
      experiment.setState({ value: 2 })
      expect(experiment.state.value).toEqual(2)
    })

    test(`the setState method merge the current state with the new one`, () => {
      const variant = new Variant('experiment_variant', 1, 234)
      const value = Math.random()
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [variant],
        initialState() {
          return { value, otherValue: 1 }
        },
        track() {}
      })

      experiment.activate()
      expect(experiment.state).toEqual({ value, otherValue: 1 })
      experiment.setState({ otherValue: 2 })
      expect(experiment.state).toEqual({ value, otherValue: 2 })
    })
  })

  describe(`.track()`, () => {
    test(`track constructor will be call when the experiment is active, not completed and track method is call`, () => {
      const track = jest.fn()
      const event: SegmentEvent = {
        type: 'track',
        name: 'Event',
        properties: {}
      }
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [],
        track
      })

      experiment.track(event)
      expect(track.mock.calls.length).toEqual(0)

      experiment.activate()
      experiment.track(event)
      expect(track.mock.calls.length).toEqual(1)
      expect(track.mock.calls[0]).toEqual([event, experiment])

      experiment.complete()
      experiment.track(event)
      expect(track.mock.calls.length).toEqual(1)
    })
    test(`track constructor is able to call the complete method`, () => {
      const track = jest
        .fn()
        .mockImplementation(
          (event: SegmentEvent, experiment: Experiment<any>) => {
            if (event) {
              experiment.complete()
            }
          }
        )
      const event: SegmentEvent = {
        type: 'track',
        name: 'Event',
        properties: {}
      }
      const experiment = new Experiment({
        name: 'experiment_test',
        variants: [],
        track
      })

      experiment.activate()
      expect(experiment.isActive()).toBe(true)
      expect(experiment.isCompleted()).toBe(false)

      experiment.track(event)
      expect(track.mock.calls.length).toEqual(1)
      expect(track.mock.calls[0]).toEqual([event, experiment])
      expect(experiment.isActive()).toBe(false)
      expect(experiment.isCompleted()).toBe(true)
    })
  })

  describe(`.getAllVariants()`, () => {
    test(`return all variants`, () => {
      const variant1 = new Variant('experiment_variant_1', 0.1, 12)
      const variant2 = new Variant('experiment_variant_2', 0.1, 34)
      const variant3 = new Variant('experiment_variant_3', 0.1, 34)
      const experiment1 = new Experiment({
        name: 'experiment_test',
        variants: [variant1, variant2, variant3],
        track() {}
      })

      const experiment2 = new Experiment({
        name: 'experiment_test',
        variants: null,
        track() {}
      } as any)

      expect(experiment1.getAllVariants()).toEqual([
        variant1,
        variant2,
        variant3
      ])
      expect(experiment2.getAllVariants()).toEqual([])
    })
  })

  // describe(``)
})
