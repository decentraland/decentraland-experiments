# RFC: Experiment Tracking Tool (A/B Testing)

## Introduction

This proposal explores a possible interface of a library that tries to reach the following goals:

- reduce code necessary to implement a test in the applications
- decouple a/b testing logic from application logic
- build on top of the current [Experiment Events AP](https://docs.google.com/document/d/15C45poyAaw67t5nkNWEB7bxwGSRPRr_aQuEgrygeFWM/edit#heading=h.7eodul3wye7b)

## Experiments API (JS)

```typescript
interface ExperimentsConstructor {
  /**
   * @param experiments - list of experiment running
   * @param storage - to persist the same result for the user
   * @param analytics - segment api
   */
  new (
    experiments: { [experimentId: string]: Experiment },
    storage: Storage = localStorage,
    analytics?: EventEmitter
  ): Experiments
}

interface Experiments {
  /**
   * if there are any experiment active for `experimentId` return the testing value
   * otherwise return `defaultValue`
   */
  getCurrentValueFor<T>(experimentId: string, defaultValue: T): T

  /**
   * return an array with all values available for `experimentId`
   */
  getAllValuesFor<T>(experimentId: string): T[]

  /**
   * detach all experiments from segment events
   */
  detach(): void
}
```

### How to use it (Vanilla JS)

Instantiate all experiments

```typescript

  const experiments = new Experiments({ avatar_signup_test: ... }, localStorage, analytics)

```

Retrieve and use the test value

```typescript
// if there are any test for `avatar_signup_test` it will be activate
const value = experiments.getCurrentValueFor('avatar_signup_test', 'Sing Up')
```

Track segments events

```typescript
analytics.track(SIGNUP_EVENT)
```

> NOTE: It is not necessary to know which segment event complete the test, that logic is managed by each test

### How to use it (React+Context)

Instantiate all experiment

```typescript

  const experiments = new Experiments({ avatar_signup_test: ... }, localStorage, analytics)

```

Add `Context.Provider` to initial render

```jsx
ReactDOM.render(
  <ExperimentsContext.Provider value={experiments}>
    {/* ... */}
  </ExperimentsContext.Provider>,
  document.getElementById('root')
)
```

Add `Context` to the testing element and retrieve the test value

```jsx

  export default class SignUpButton extends React.PureComponent<Props, State> {

    static contextType = ExperimentsContext

    render() {
      const { currentProject, onLoadAssetPacks, onOpenModal } = this.props
      const text = this.context.getCurrentValueFor('avatar_signup_test', 'Sing Up')

      <Button>{text}</Button>
    }
  }

```

Track segments events

```jsx

  export default class SignUpButton extends React.PureComponent<Props, State> {

    static contextType = ExperimentsContext

    handleClick = (event: React.MouseEvent<HTMLElement>) => {
      // ...
      analytics.track(SIGNUP_EVENT)
    }

    render() {
      const { currentProject, onLoadAssetPacks, onOpenModal } = this.props
      const text = this.context.getCurrentValueFor('avatar_signup_test', 'Sing Up')

      <Button onClick={this.handleClick}>{text}</Button>
    }
  }

```

### How to test it (JEST)

Instantiate all experiment

```typescript

  beforeAll(() => {
    experiments = new Experiments({ avatar_signup_test: ... }, localStorage)
  })
```

Retrieve all values and ensure its types

```typescript
test(`all experiment value for avatar_signup_test are not empty strings`, () => {
  for (const value of experiments.getAllValuesFor('avatar_signup_test')) {
    expect(typeof value).toBe('string')
    expect(value.length).toBeGreaterThanOrEqual(5)
  }
})
```

## Experiment API (JS)

Define each experiment

```typescript

  interface ExperimentOptions<T, S extends {} = {}> {
    /**
     * name reported to segment
     */
    name: string;

    /**
     * list of values available for the experiment
     */
    variants: Array<Variant<T>>;

    /**
     * initial state for the experiment
     */
    initialState(): S;

    /**
     * this function will be call on each segment event allowing to modify
     * the experiment's state using `currentExperiment.setState({ ... })`
     * and complete the experiment using `currentExperiment.complete()`
     */
    track: (event: SegmentEvent, currentExperiment: Experiment) => void;
  }

  interface ExperimentConstructor<T, , S extends {} = {}> {
    new(options: ExperimentOptions<T, S>): Experiment<T, S>
  }

  interface Experiment<T, S extends {} = {}> {

    /**
     * value of the current variant
     */
    value: T;

    /**
     * Experiment state, allow to collect extra data
     */
    state: s;

    /**
     * Finish the test, marks it as completed and dispatch
     * the `experiment_conversion` event with the final state to segment
     */
    complete(): void;

    /**
     * Modify de state using `Object.assign`
     */
    setState(patchState: Partial<T>): void;
  }

```

## Variant API (JS)

```typescript
interface VariantConstructor<T> {
  new (name: string, ratio: number, value: T): Variant<T>
}

interface Variant<T> {
  /**
   * id of de current variant on segment
   */
  name: string

  /**
   * number between 0 and 1, define de probability to get this variant
   */
  ratio: number

  /**
   * value
   */
  value: T
}
```

## How to define an experiments

### Example: track conversion

```typescript
import Experiment from '.../Experiment'
import Variant from '.../Variant'

const experiments = {
  // ...
  avatar_signup_test: new Experiment({
    name: 'signup_vs_send',
    variants: [
      new Variant('signup', 0.5, 'Sign up'),
      new Variant('send', 0.5, 'Send')
    ],
    trace: (event: SegmentEvent, currentExperiment: Experiment) => {
      if (event.type === 'track' && event.name === SIGNUP_EVENT) {
        currentExperiment.complete()
      }
    }
  })

  // ...
}

export default experiments
```

### Example: track conversion time

```typescript
import Experiment from '.../Experiment'
import Variant from '.../Variant'

const experiments = {
  // ...
  avatar_signup_test: new Experiment({
    name: 'signup_vs_send',
    variants: [
      new Variant('signup', 0.5, 'Sign up'),
      new Variant('send', 0.5, 'Send')
    ],
    initialState: () => {
      return {
        startAt: Date.now(),
        duration: 0
      }
    },
    trace: (event: SegmentEvent, currentExperiment: Experiment) => {
      if (event.type === 'track' && event.name === SIGNUP_EVENT) {
        const startAt = currentExperiment.state
        currentExperiment.setState({ duration: Date.now() - startAt })
        currentExperiment.complete()
      }
    }
  })

  // ...
}

export default experiments
```

### Example: track amount of events

```typescript
import Experiment from '.../Experiment'
import Variant from '.../Variant'

const experiments = {
  // ...
  avatar_signup_test: new Experiment({
    name: 'signup_vs_send',
    variants: [
      new Variant('signup', 0.5, 'Sign up'),
      new Variant('send', 0.5, 'Send')
    ],
    initialState: () => {
      return {
        validationErrors: 0
      }
    },
    trace: (event: SegmentEvent, currentExperiment: Experiment) => {
      if (event.type === 'track' && event.name === SIGNUP_EVENT) {
        currentExperiment.complete()
      } else if (
        event.type === 'track' &&
        event.name === SIgNUP_VALIDATION_ERROR
      ) {
        const validationErrors = currentExperiment.state
        currentExperiment.setState({ validationErrors: validationErrors + 1 })
      }
    }
  })

  // ...
}

export default experiments
```

### Example: track extra properties

```typescript
import Experiment from '.../Experiment'
import Variant from '.../Variant'

const experiments = {
  // ...
  avatar_signup_test: new Experiment({
    name: 'signup_vs_send',
    variants: [
      new Variant('signup', 0.5, 'Sign up'),
      new Variant('send', 0.5, 'Send')
    ],
    initialState: () => {
      return {
        initialMana: 0
      }
    },
    trace: (event: SegmentEvent, currentExperiment: Experiment) => {
      if (event.type === 'track' && event.name === SIGNUP_EVENT) {
        currentExperiment.setState({
          initialMana: event.properties.initialMana
        })
        currentExperiment.complete()
      }
    }
  })

  // ...
}

export default experiments
```
