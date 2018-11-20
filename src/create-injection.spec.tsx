// tslint:disable:max-classes-per-file

import 'reflect-metadata';

import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Container, injectable } from 'inversify';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { flushPromises } from '../testing/helpers';
import { createInjection, InjectableProps } from './create-injection';
import { ReactiveService } from './reactive-service';
import { StateTracker } from './state-tracker';

// Configure enzyme.
Enzyme.configure({ adapter: new Adapter() });

interface SampleState {
  sample: string;
}

@injectable()
// @ts-ignore
class SampleService extends ReactiveService<SampleState> {
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

interface SamplePropsInjected {
  sampleService: SampleService;
}

interface SampleProps {
  normalProp: string;
}

const sampleIdent = 'sample-service';
const injectConfig = {
  sampleService: sampleIdent,
};

let container: Container;
let injection: ReturnType<typeof createInjection>;
let sampleProps: SampleProps & SamplePropsInjected;

class SampleComponent extends Component<SampleProps & SamplePropsInjected> {
  public state = { test: 'testing' };

  public constructor(props: SampleProps & SamplePropsInjected) {
    super(props);
    sampleProps = props;
  }

  public render() {
    return (
      <>
        <div className="render">test render</div>
        <p className="normal">{this.props.normalProp}</p>
        <p className="sample">{this.props.sampleService.sample}</p>
      </>
    );
  }
}

function init() {
  return {
    div: document.createElement('div'),
    IP: injection.InjectionProvider,
    InjectedComponent: injection.injectComponent<InjectableProps<SamplePropsInjected>>(injectConfig)(SampleComponent),
  };
}

function renderHtml(shallowRend: Enzyme.ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>) {
  return new DOMParser().parseFromString(shallowRend.html(), 'text/html');
}

beforeEach(() => {
  container = new Container();
  container.bind(StateTracker).toSelf().inSingletonScope();
  container.bind(sampleIdent).to(SampleService).inSingletonScope();

  injection = createInjection();
});

it('initialises', () => {
  const {
    div,
    IP,
    InjectedComponent,
  } = init();

  ReactDOM.render(
    <IP container={container}>
      <InjectedComponent normalProp="tesing prop" />
    </IP>,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});

it('support passing the container by props', () => {
  const {
    div,
    InjectedComponent,
  } = init();

  ReactDOM.render(
    <InjectedComponent normalProp="tesing prop" container={container} />,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});

it('passes an instance of the injected service to the injected component', () => {
  const {
    InjectedComponent,
  } = init();

  const rend = shallow(<InjectedComponent normalProp="tesing prop" container={container} />);
  const doc = renderHtml(rend);

  expect(sampleProps.sampleService).toBeInstanceOf(SampleService);
  expect(doc.querySelector('.sample')!.textContent).toBe('value1');
});

it('updates the component when the service state changes', async () => {
  const {
    div,
    InjectedComponent,
  } = init();

  ReactDOM.render(
    <InjectedComponent normalProp="tesing prop" container={container} />,
    div,
  );

  expect(sampleProps.sampleService).toBeInstanceOf(SampleService);

  sampleProps.sampleService.setSample('new value');
  await flushPromises();

  expect(div.querySelector('.sample')!.textContent).toBe('new value');

  ReactDOM.unmountComponentAtNode(div);
});
