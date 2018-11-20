import 'reflect-metadata';

import { Container } from 'inversify';
import { flushPromises } from '../testing/helpers';
import { ReactiveService } from './reactive-service';
import { StateTracker } from './state-tracker';

interface SampleState {
  test: string;
}

class SampleService extends ReactiveService<SampleState> {
  protected state: SampleState = {
    test: 'testing',
  };

  public get test(): string {
    return this.state.test;
  }

  public setTest(test: string): void {
    this.setState({
      test,
    });
  }
}

let service: SampleService;

beforeEach(() => {
  service = new SampleService();
});

it('enqueues an update on setState', async () => {
  // @ts-ignore
  service.stateTracker = new StateTracker();

  expect(service.test).toBe('testing');

  service.setTest('new value');

  await flushPromises();

  expect(service.test).toBe('new value');
});

it('should work in inversify', () => {
  const container = new Container();
  container.bind(StateTracker).toSelf().inSingletonScope();
  container.bind(SampleService).toSelf();

  const sampleService = container.get(SampleService);
  expect(sampleService).toBeInstanceOf(SampleService);
});
