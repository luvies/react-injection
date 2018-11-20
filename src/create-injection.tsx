import { Container, interfaces as inversifyTypes } from 'inversify';
import React, { ComponentType, createContext, ReactNode } from 'react';
import { StateTracker } from './state-tracker';

// ------ react-redux type definitions ------

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * a property P will be present if :
 * - it is present in both DecorationTargetProps and InjectedProps
 * - InjectedProps[P] can satisfy DecorationTargetProps[P]
 * ie: decorated component can accept more types than decorator is injecting
 *
 * For decoration, inject props or ownProps are all optionally
 * required by the decorated (right hand side) component.
 * But any property required by the decorated component must be satisfied by the injected property.
 */
type Shared<
  InjectedProps,
  DecorationTargetProps extends Shared<InjectedProps, DecorationTargetProps>
  > = {
    [P in Extract<keyof InjectedProps, keyof DecorationTargetProps>]?: InjectedProps[P] extends DecorationTargetProps[P] ? DecorationTargetProps[P] : never;
  };


// ------ Injection ------

export type InjectConfig = Record<string, inversifyTypes.ServiceIdentifier<any>>;

export type InjectableProps<T> = {
  [K in keyof T]: inversifyTypes.ServiceIdentifier<any>;
};

type ProviderProps = { container: Container, children: ReactNode };

/**
 * Creates an object that contains a provider component that can be used to pass
 * the container down to child components, and an injector decorator that can be used
 * to inject services into a component.
 */
export function createInjection(defaultContainer?: Container) {
  // Create a react context to allow sharing of the given container.
  const { Provider, Consumer } = createContext(defaultContainer);

  return {
    /**
     * Provides child components with the given container.
     */
    InjectionProvider: class InjectionProvider extends React.Component<ProviderProps> {
      public constructor(props: ProviderProps) {
        super(props);

        // Make sure StateTracker has been bound to the current container.
        if (!props.container.isBound(StateTracker)) {
          props.container.bind(StateTracker).toSelf().inSingletonScope();
        }
      }

      public render() {
        return <Provider value={this.props.container}>{this.props.children}</Provider>;
      }
    },

    /**
     * Returns a function that will create a component that will have the requested services
     * injected as props.
     */
    injectComponent<TInject extends InjectConfig>(
      inject: TInject,
    ) {
      type RemoveInjectedProps<TBase> = Omit<TBase, keyof Shared<TInject, TBase>> & { container?: Container };

      // Return an full-bodied function to prevent syntax errors due to JSX conflicts.
      return function <TBaseProps>(
        Component: ComponentType<TBaseProps>,
      ): ComponentType<RemoveInjectedProps<TBaseProps>> {
        const injector = class extends React.Component<RemoveInjectedProps<TBaseProps>> {
          private stateTracker?: StateTracker;

          public componentDidMount() {
            this.bindHandlers();
          }

          public componentDidUpdate() {
            this.bindHandlers();
          }

          public componentWillUnmount() {
            this.unbindHandlers();
          }

          public render() {
            return (
              <Consumer>
                {container => {
                  // Extract container from props or consumer.
                  container = this.props.container || container;

                  // Ensure that we got a container from somewhere.
                  if (!container) {
                    throw new Error(
                      'No container was provided, either provide a default one or use a ContainerProvider component.',
                    );
                  }

                  // Unbind handlers first to prevent memory leaks.
                  this.unbindHandlers();

                  // Get the current state tracker.
                  this.stateTracker = container.get(StateTracker);

                  // Get the necessary services that we need to inject.
                  const services: Record<string, any> = {};
                  for (const key of Object.keys(inject)) {
                    services[key] = container.get(inject[key]);
                  }

                  // Init the wrapper component with the given props and services.
                  return <Component {...this.props} {...services} />;
                }}
              </Consumer>
            );
          }

          private bindHandlers() {
            if (this.stateTracker) {
              this.stateTracker.handlers.add(this.handleUpdate);
            }
          }

          private unbindHandlers() {
            if (this.stateTracker) {
              this.stateTracker.handlers.delete(this.handleUpdate);
            }
          }

          private handleUpdate = () => {
            // Trigger render.
            this.setState({});
          }
        };

        // Give the component a useful name for debugging.
        if (process.env.NODE_ENV === 'development') {
          Object.defineProperty(injector, 'name', {
            value: `Injector(${Component.displayName || Component.name || 'Component'})`,
          });
        }

        return injector;
      };
    },
  };
}
