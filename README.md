# decentraland-experiments

![Codecov](https://img.shields.io/codecov/c/github/decentraland/decentraland-experiments)
![npm](https://img.shields.io/npm/v/decentraland-experiments)

🛠 Experiment Tracking Tool (A/B Testing)

> Implemented from [RFC](RCF.md) ([#54](https://github.com/decentraland/decentraland-dapps/issues/54))

## Index

- [Installation](#installation)
- [Usage](#usage)
  - [Vanilla JS](#vanilla-js)
  - [React](#react)
  - [React+Context](#react--context)
- [Testing](#testing-with-jest)

## Installation

```bash
  npm install -s decentraland-experiments
```

## Usage

### Vanilla JS

Instantiate all experiments

```typescript
import { Experiments, Experiment, Variant } from 'decentraland-experiments';

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

### React

Instantiate all experiments

```typescript
import { Experiments, Experiment, Variant } from 'decentraland-experiments';

const experiments = new Experiments({ avatar_signup_test: ... }, localStorage, analytics)
```

Retrieve and use the test value

```jsx
import { experiments } from 'path/to/experiments'

export default class SignUpButton extends React.PureComponent<Props, State> {

  render() {
    const text = experiments.getCurrentValueFor('avatar_signup_test', 'avatars.form.signup')
    <Button>{t(text)}</Button>
  }
}
```

Track segments events

```jsx
import { experiments } from 'path/to/experiments'

export default class SignUpButton extends React.PureComponent<Props, State> {

  handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // ...
    analytics.track(SIGNUP_EVENT)
  }

  render() {
    const text = experiments.getCurrentValueFor('avatar_signup_test', 'avatars.form.signup')
    <Button onClick={this.handleClick}>{t(text)}</Button>
  }
}
```

### React + Context

Create the new Context without experiments

```typescript
import { Experiments } from 'decentraland-experiments'

const ExperimentsContext = React.createContext(new Experiments({}))
```

Instantiate all experiments

```typescript
import { Experiments, Experiment, Variant } from 'decentraland-experiments';

const experiments = new Experiments({ avatar_signup_test: ... }, localStorage, analytics)
```

Add `Context.Provider` to initial render and set the experiments instance as value property

```jsx
import ExperimentsContext from 'path/to/context'

ReactDOM.render(
  <ExperimentsContext.Provider value={experiments}>
    {/* ... */}
  </ExperimentsContext.Provider>,
  document.getElementById('root')
)
```

Add `Context` to the testing element and retrieve the test value

```jsx
import ExperimentsContext from 'path/to/context';

export default class SignUpButton extends React.PureComponent<Props, State> {

  static contextType = ExperimentsContext

  render() {
    const text = this.context.getCurrentValueFor('avatar_signup_test', 'avatars.form.signup')
    <Button>{t(text)}</Button>
  }
}
```

Track segments events

```jsx
import ExperimentsContext from 'path/to/context';

export default class SignUpButton extends React.PureComponent<Props, State> {

  handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // ...
    analytics.track(SIGNUP_EVENT)
  }

  render() {
    const text = this.context.getCurrentValueFor('avatar_signup_test', 'avatars.form.signup')
    <Button>{t(text)}</Button>
  }
}
```

## Testing (with Jest)

Retrieve all values and ensure its types

```typescript
import { experiments } from 'path/to/experiments'

test(`all experiment value for avatar_signup_test are not empty strings`, () => {
  for (const value of experiments.getAllValuesFor('avatar_signup_test')) {
    expect(typeof value).toBe('string')
    expect(value.length).toBeGreaterThanOrEqual(5)
  }
})
```
