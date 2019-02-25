import { Container, inject, injectable } from 'inversify';
import { ReactiveService } from '../src/reactive-service';
import { StateTracker } from '../src/state-tracker';

export function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

export const sampleIdent = 'sample-service';

interface SampleState {
  sample: string;
}

@injectable()
// @ts-ignore
export class SampleService extends ReactiveService<SampleState> {
  protected state: SampleState = {
    sample: 'value1',
  };

  public get sample(): string {
    return this.state.sample;
  }

  public setSample(sample: string): void {
    this.setState({
      sample,
    });
  }
}

@injectable()
// @ts-ignore
export class SecondaryService {
  public constructor(
    // @ts-ignore
    @inject(sampleIdent)
    private sample: SampleService,
  ) { }

  public get test(): string {
    return this.sample.sample;
  }

  public setTest(sample: string): void {
    this.sample.setSample(sample);
  }
}

export function initContainer(synchronous = false) {
  const container = new Container();
  container.bind(StateTracker).toSelf().inSingletonScope();
  container.bind(sampleIdent).to(SampleService).inSingletonScope();
  container.bind(SecondaryService).toSelf();

  const stateTracker = container.get(StateTracker);
  (stateTracker as any).synchronous = synchronous;

  return container;
}
