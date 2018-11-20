import 'reflect-metadata';

import { flushPromises } from '../testing/helpers';
import { IStatefulService, StateTracker } from './state-tracker';

interface SampleState {
  test: string;
  test2: string;
}

class SampleService implements IStatefulService<SampleState> {
  public state: SampleState = {
    test: 'testing',
    test2: 'testing 2',
  };
}

let service: SampleService;
let tracker: StateTracker;
let handlerCalls: number;

function handler() {
  handlerCalls++;
}

function altHandler() {
  handlerCalls++;
}

beforeEach(() => {
  service = new SampleService();
  tracker = new StateTracker();
  handlerCalls = 0;
});

it('performs an object state change', async () => {
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new-value' },
  });

  await flushPromises();

  expect(service.state).toEqual({
    test: 'new-value',
    test2: 'testing 2',
  });
});

it('fires connected handlers on a state change', async () => {
  tracker.handlers.add(handler);
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
  });

  await flushPromises();

  expect(handlerCalls).toBe(1);
});

it('fires all connected handlers on a state change', async () => {
  tracker.handlers.add(handler);
  tracker.handlers.add(altHandler);
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
  });

  await flushPromises();

  expect(handlerCalls).toBe(2);
});

it('handles all enqueued updates', async () => {
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
  });
  tracker.enqueueUpdate({
    service,
    updater: { test2: 'changed value' },
  });

  await flushPromises();

  expect(service.state).toEqual({
    test: 'new value',
    test2: 'changed value',
  });
});

it('handles a function update correctly', async () => {
  tracker.enqueueUpdate({
    service,
    updater: () => ({ test: 'new value' }),
  });

  await flushPromises();

  expect(service.state).toEqual({
    test: 'new value',
    test2: 'testing 2',
  });
});

it('passes the previous state to the update function', async () => {
  let prevState: SampleState | undefined;

  tracker.enqueueUpdate({
    service,
    updater: { test2: 'changed value' },
  });
  tracker.enqueueUpdate({
    service,
    updater: prev => {
      prevState = prev;

      return {
        test: 'new value',
      };
    },
  });

  await flushPromises();

  expect(prevState).toEqual({
    test: 'testing',
    test2: 'changed value',
  });
});

it('calls the after function after the update', async () => {
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
    after: handler,
  });

  await flushPromises();

  expect(handlerCalls).toBe(1);
});

it('calls all after functions after the update', async () => {
  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
    after: handler,
  });
  tracker.enqueueUpdate({
    service,
    updater: { test2: 'changed value' },
    after: altHandler,
  });

  await flushPromises();

  expect(handlerCalls).toBe(2);
});

it('passes the new state to the after function', async () => {
  let newState: SampleState | undefined;

  tracker.enqueueUpdate({
    service,
    updater: { test: 'new value' },
    after: state => {
      newState = state;
    },
  });
  tracker.enqueueUpdate({
    service,
    updater: { test2: 'changed value' },
  });

  await flushPromises();

  expect(newState).toEqual({
    test: 'new value',
    test2: 'changed value',
  });
});

it('should not trigger an update if the updater value was undefined', async () => {
  tracker.handlers.add(handler);
  tracker.enqueueUpdate({
    service,
    updater: undefined,
  });

  await flushPromises();

  expect(handlerCalls).toBe(0);
});

it('should not fire the after function if the updater was undefined', async () => {
  tracker.enqueueUpdate({
    service,
    updater: undefined,
    after: handler,
  });

  await flushPromises();

  expect(handlerCalls).toBe(0);
});

it('should not trigger an update if the updater function returned undefined', async () => {
  tracker.handlers.add(handler);
  tracker.enqueueUpdate({
    service,
    updater: () => undefined,
  });

  await flushPromises();

  expect(handlerCalls).toBe(0);
});

it('should not fire the after function if the updater function returned undefined', async () => {
  tracker.enqueueUpdate({
    service,
    updater: () => undefined,
    after: handler,
  });

  await flushPromises();

  expect(handlerCalls).toBe(0);
});
