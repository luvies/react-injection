import { inject, injectable } from 'inversify';
import { AfterFn, StateTracker, StateUpdater } from './state-tracker';

@injectable()
export abstract class ReactiveService<TState extends object> {
  protected abstract state: TState;

  @inject(StateTracker)
  private stateTracker!: StateTracker;

  protected setState(updater: StateUpdater<TState>, after?: AfterFn<TState>): void {
    this.stateTracker.enqueueUpdate({
      // @ts-ignore
      service: this,
      updater,
      after,
    });
  }
}
