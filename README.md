# React Dependency Injection
[![Build Status](https://travis-ci.com/luvies/react-injection.svg?branch=master)](https://travis-ci.com/luvies/react-injection) [![Coverage Status](https://coveralls.io/repos/github/luvies/react-injection/badge.svg?branch=master)](https://coveralls.io/github/luvies/react-injection?branch=master)

Provides a dependency injection system for React using InversifyJS. Each service can inherit the class `ReactiveService<TState>` to allow them to trigger component updates when their state changes, allowing for components to use service data in their render functions and respond to changes.

This package provides both a HOC and a `useInjection` hook.

## Example Guide
To define a service, you need to define a class similar to this:

```ts
import { injectable } from 'inversify';
import { ReactiveService } from 'react-injection';

interface State {
  data: string;
}

@injectable()
export class DataService extends ReactiveService<State> {
  protected state: State = {
    data: 'sample data',
  };

  public get data(): string {
    return this.state.data;
  }

  public setData(data: string): void {
    this.setState({
      data,
    });
  }
}
```

You can then create an Inversify container with this service bound to it, and define a module that provides the provider component and HOC decorator.

```ts
// injection.ts
import { createInjection } from 'react-injection';

export { InjectionProvider, injectComponent } = createInjection();
```

You can then consume the service from your components like so:

```tsx
import React from 'react';
import { injectComponent } from './injection';
import { InjectableProps } from 'react-injection';
// This is assuming that the container is set up using the TYPES
// style from the InversifyJS docs.
import { TYPES } from './types';

interface InjectedProps {
  // You could also name this just 'data' for simplicity.
  dataService: DataService;
}

function App({ dataService }: InjectedProps) {
  return (
    <p>{dataService.data}</p>
  );
}

export default injectComponent<InjectedProps>({
  dataService: TYPES.DataService
})(App);
```

Note: `injectComponent` should be usable as a decorator, however TypeScript currently doesn't allow decorators to change the decorated definition's typing currently (since this function removes the injected props from the components typing). If you use babel and JSX/JS, then it should work fine (although I haven't tested this).

Once you have this set up, you can provide the container using the provider component:

```tsx
ReactDOM.render(
  <InjectionProvider container={container}>
    <App />
  </InjectionProvider>,
  element
);
```

### State mapping
You can map service states directly to props using the second param of `injectComponent`, which takes in a function that receives all of the injected services, and return an object to map into props. Example:

```tsx
interface InjectedProps {
  dataService: DataService;
}

interface InjectedStateProps {
  data: string;
}

function App({ data }: InjectedProps & InjectedStateProps) {
  return (
    <p>{data}</p>
  );
}

export default injectComponent<InjectedProps, InjectedStateProps>(
  {
    dataService: TYPES.DataService
  },
  ({ dataService }) => ({
    data: dataService.data,
  })
)(App);
```

Keep note, the services are injected regardless of whether you use the state mapper or not. It is mostly a helper to allow more direct access to service state & allow proper diffing in `componentDidUpdate(...)`.

## Passing container as props directly
The `injectComponent` decorator supports containers being passed directly as the prop `container`, however, if you do this, note that you **_MUST_** bind the `StateTracker` class like so:

```ts
// Import using a similar statement to this
import { StateTracker } from 'react-injection';

// Bind the class manually
container.bind(StateTracker).toSelf().inSingletonScope();
```

It *must* be bound to itself and in the singleton scope to work properly, otherwise state update might not propagate properly from services. If you do not bind this class like this, then non of the services that inherit `ReactiveService` will work at all (since they require the class to be injected via props). If you do not use `ReactiveService`, then you do not need to do this binding, since it wil just skip it.

## Hook
To use the hook, you can do something like the following:

```tsx
// Imports from this module used in the example.
import { useInjection, InjectableProps } from 'react-injection';

// Configure the container from somewhere.
const container = configureContainer();

// Create the React context.
// You can also use the context returned from `createInjection` if you plan to
// mix both kinds.
const context = createContext(container);

// Consume the services in the component.
interface InjectedProps {
  dataService: DataService;
}

// If you define this object outside of the component,
// it will be re-used for each render, and `useInjection`
// will skip re-fetching the same services multiple times
// (this is implmented via `useMemo`).
// You can still use it inline if you want.
const services: InjectableProps<InjectedProps> = {
  dataService: TYPES.DataService,
}

function App() {
  const { dataService } = useInjection(context, services);
  const data = dateService.data;

  return (
    <p>{data}</p>
  );
}
```

If you plan on using the same context in a lot of places, you can easily wrap the hook:

```ts
export function useInject<T>(inject: InjectableProps<T>) {
  return useInjection<T>(context, inject);
}
```

This means that the App component would look like this:

```tsx
function App() {
  const { dataService } = useInject(services);
  const data = dateService.data;

  return (
    <p>{data}</p>
  );
}
```
