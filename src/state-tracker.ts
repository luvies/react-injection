export interface IStatefulService<TState> {
  state: TState;
}

export type StateUpdater<TState> = Partial<TState> | ((prev: TState) => TState | undefined) | undefined;

export type AfterFn<TState> = (state: TState) => void;

export type HandlerFn = () => void;

export interface StateChange<TState> {
  updater: StateUpdater<TState>;
  after?: AfterFn<TState>;
}

export class StateTracker<TState, TService extends IStatefulService<TState>> {
  public handlers = new Set<HandlerFn>();

  private changes: Array<StateChange<TState>> = [];
  private intervalTracker?: number;

  public constructor(
    private service: TService,
  ) { }

  public enqueueUpdate(update: StateChange<TState>): void {
    this.changes.push(update);

    if (!this.intervalTracker) {
      this.intervalTracker = setTimeout(() => this.handleUpdate());
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

    if (performedChange) {
      for (const handler of this.handlers) {
        handler();
      }

      for (const after of afters) {
        after(this.service.state);
      }
    }
  }
}
