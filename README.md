# React Dependency Injection
[![Build Status](https://travis-ci.com/luvies/react-injection.svg?branch=master)](https://travis-ci.com/luvies/react-injection) [![Coverage Status](https://coveralls.io/repos/github/luvies/react-injection/badge.svg?branch=master)](https://coveralls.io/github/luvies/react-injection?branch=master)

Provides a dependency injection system for React using InversifyJS. Each service can inherit the class `ReactiveService<TState>` to allow them to trigger component updates when their state changes, allowing for components to use service data in their render functions and respond to changes.

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

// The InjectableProps<T> type will fully type the function, allowing
// for missing props to be caught here & for full intellisense support.
// You can remove the generic <InjectableProps<InjectedProps>> and use
// the implicit typing if you wish.
export default injectComponent<InjectableProps<InjectedProps>>({
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
