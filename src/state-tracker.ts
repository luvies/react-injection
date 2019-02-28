import { Container, injectable } from 'inversify';

export interface IStatefulService<TState> {
  state: TState;
}

export type StateUpdater<TState> = Partial<TState> | ((prev: TState) => Partial<TState> | undefined) | undefined;

export type AfterFn<TState> = (state: TState) => void;

export type HandlerFn = () => void;

export interface StateChange<TState> {
  service: IStatefulService<TState>;
  updater: StateUpdater<TState>;
  after?: AfterFn<TState>;
}

@injectable()
export class StateTracker {
  public static bindToContainer(container: Container) {
    if (!container.isBound(StateTracker)) {
      container.bind(StateTracker).toSelf().inSingletonScope();
    }
  }

  public handlers = new Set<HandlerFn>();

  private changes: Array<StateChange<any>> = [];
  private scheduledUpdate = false;
  private synchronous = false;

  public enqueueUpdate<TState>(update: StateChange<TState>): void {
    this.changes.push(update);

    if (!this.synchronous) {
      if (!this.scheduledUpdate) {
        Promise.resolve().then(() => this.handleUpdate<TState>());
        this.scheduledUpdate = true;
      }
    } else {
      this.handleUpdate<TState>();
    }
  }

  private handleUpdate<TState>() {
    let change: StateChange<TState> | undefined;
    let performedChange = false;
    const afters: Array<{
      service: IStatefulService<TState>,
      after: AfterFn<TState>,
    }> = [];

    while (change = this.changes.shift()) {
      let newState: Partial<TState> | undefined;

      if (typeof change.updater === 'function') {
        newState = change.updater(change.service.state);
      } else {
        newState = change.updater;
      }

      if (!newState) {
        continue;
      }

      change.service.state = Object.assign(
        {},
        change.service.state,
        newState,
      );
      performedChange = true;

      if (change.after) {
        afters.push({
          service: change.service,
          after: change.after,
        });
      }
    }

    this.scheduledUpdate = false;
    if (performedChange) {
      // Copy all of the handlers to a separate list.
      // This is because when each handler is fired, there's a chance
      // that the component it's from will unbind & rebind, causing the next
      // item in the set to be the same handler.
      const handlersCpy: HandlerFn[] = [];
      this.handlers.forEach(handler => handlersCpy.push(handler));

      // Fire all the handlers.
      for (const handler of handlersCpy) {
        // Since a handler may be unbound as a result of calling
        // the previous handlers, we need to double check that the
        // handler is still bound.
        if (this.handlers.has(handler)) {
          handler();
        }
      }

      for (const { after, service } of afters) {
        after(service.state);
      }
    }
  }
}
