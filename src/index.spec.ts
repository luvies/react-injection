import 'reflect-metadata';

import * as test from './index';

// Small test validating that the index exports the right things
it('should export all relevant definitions', () => {
  expect(typeof test.ReactiveService).toBe('function');
  expect(typeof test.StateTracker).toBe('function');
  expect(typeof test.createInjection).toBe('function');
});
