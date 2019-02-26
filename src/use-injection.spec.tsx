import 'reflect-metadata';

import { Container } from 'inversify';
import React, { Context, createContext } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { initContainer, sampleIdent, SampleService, SecondaryService } from '../testing/helpers';
import { InjectableProps } from './create-injection';
import { useInjection } from './use-injection';

let root: HTMLDivElement;
let container: Container;
let context: Context<Container>;

function useInject<T>(inject: InjectableProps<T>): T {
  return useInjection(context, inject);
}

interface InjectedProps {
  sample: SampleService;
  secondary: SecondaryService;
}

function InjectedComponent() {
  const { sample, secondary } = useInject<InjectedProps>({
    sample: sampleIdent,
    secondary: SecondaryService,
  });

  return (
    <>
      <p id="sample">{sample.sample}</p>
      <p id="secondary">{secondary.test}</p>
    </>
  );
}

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);

  container = initContainer(true);

  context = createContext(container);
});

afterEach(() => {
  document.body.removeChild(root);
});

it('can render and react to updates', () => {
  const sampleService: SampleService = container.get(sampleIdent);
  const secondaryService = container.get(SecondaryService);

  // Test initial render.
  act(() => {
    ReactDOM.render(<InjectedComponent />, root);
  });
  const sampleElement = root.querySelector('#sample') as HTMLParagraphElement;
  const secondaryElement = root.querySelector('#secondary') as HTMLParagraphElement;
  expect(sampleElement.textContent).toBe('value1');
  expect(secondaryElement.textContent).toBe('value1');

  // Set state and test change.
  act(() => {
    sampleService.setSample('value2');
  });

  expect(sampleElement.textContent).toBe('value2');
  expect(secondaryElement.textContent).toBe('value2');

  // Set state and test change
  act(() => {
    secondaryService.setTest('value3');
  });

  expect(sampleElement.textContent).toBe('value3');
  expect(secondaryElement.textContent).toBe('value3');
});
