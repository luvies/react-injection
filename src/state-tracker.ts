export interface IStatefulService<TState> {
  state: TState;
}

export type StateUpdater<TState> = Partial<TState> | ((prev: TState) => Partial<TState> | undefined) | undefined;

export type AfterFn<TState> = (state: TState) => void;

export type HandlerFn = () => void;

export interface StateChange<TState> {
  updater: StateUpdater<TState>;
  after?: AfterFn<TState>;
}

export class StateTracker<TState, TService extends IStatefulService<TState>> {
  public handlers = new Set<HandlerFn>();

  private changes: Array<StateChange<TState>> = [];
  private scheduledUpdate = false;

  public constructor(
    private service: TService,
  ) { }

  public enqueueUpdate(update: StateChange<TState>): void {
    this.changes.push(update);

    if (!this.scheduledUpdate) {
      Promise.resolve().then(() => this.handleUpdate());
      this.scheduledUpdate = true;
    }
  }

  private handleUpdate() {
    let change: StateChange<TState> | undefined;
    let performedChange = false;
    const afters: Array<AfterFn<TState>> = [];

    while (change = this.changes.shift()) {
      let newState: Partial<TState> | undefined;

      if (typeof change.updater === 'function') {
        newState = change.updater(this.service.state);
      } else {
        newState = change.updater;
      }

      if (!newState) {
        continue;
      }

      this.service.state = Object.assign(
        {},
        this.service.state,
        newState,
      );
      performedChange = true;

      if (change.after) {
        afters.push(change.after);
      }
    }

    this.scheduledUpdate = false;
    if (performedChange) {
      // Copy all of the handlers to a separate list.
      // This is because when each handler is fired, there's a chance
      // that the component it's from will unbind & rebind, causing the next
      // item in the set to be the same handler.
      const handlersCpy: HandlerFn[] = [];
      for (const handler of this.handlers) {
        handlersCpy.push(handler);
      }

      // Fire all the handlers.
      for (const handler of handlersCpy) {
        // Since a handler may be unbound as a result of calling
        // the previous handlers, we need to double check that the
        // handler is still bound.
        if (this.handlers.has(handler)) {
          handler();
        }
      }

      for (const after of afters) {
        after(this.service.state);
      }
    }
  }
}
