import { Container, interfaces as inversifyTypes } from 'inversify';
import React, { ComponentType, createContext, ReactNode } from 'react';
import { isReactiveService } from './reactive-service';

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

/**
 * Configures an object that contains a provider component that can be used to pass
 * the container down to child components, and an injector decorator that can be used
 * to inject services into a component.
 */
export function configureInjection(defaultContainer?: Container) {
  // Create a react context to allow sharing of the given container.
  const { Provider, Consumer } = createContext(defaultContainer);

  return {
    /**
     * Provides child components with the given container.
     */
    InjectionProvider({ container, children }: { container: Container, children: ReactNode }) {
      return <Provider value={container}>{children}</Provider>;
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
          private services: Record<string, any> = {};

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

                  // Get the necessary services that we need to inject.
                  // Unbind handlers first to prevent memory leaks.
                  this.unbindHandlers();
                  this.services = {};
                  for (const key of Object.keys(inject)) {
                    this.services[key] = container.get(inject[key]);
                  }

                  // Init the wrapper component with the given props and services.
                  return <Component {...this.props} {...this.services} />;
                }}
              </Consumer>
            );
          }

          private handleUpdate = () => {
            // Trigger render.
            this.setState({});
          }

          private bindHandlers() {
            for (const service of Object.values(this.services)) {
              if (isReactiveService(service)) {
                // @ts-ignore
                const tracker = service.stateTracker;
                tracker.handlers.add(this.handleUpdate);
              }
            }
          }

          private unbindHandlers() {
            for (const service of Object.values(this.services)) {
              if (isReactiveService(service)) {
                // @ts-ignore
                const tracker = service.stateTracker;
                tracker.handlers.delete(this.handleUpdate);
              }
            }
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
