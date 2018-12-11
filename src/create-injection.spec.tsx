import 'reflect-metadata';

import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Container, inject, injectable } from 'inversify';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { flushPromises } from '../testing/helpers';
import { createInjection } from './create-injection';
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

const sampleIdent = 'sample-service';

@injectable()
// @ts-ignore
class SecondaryService {
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

interface SamplePropsInjected {
  sampleService: SampleService;
}

interface SampleProps {
  normalProp: string;
}

const injectConfig = {
  sampleService: sampleIdent,
};

let container: Container;
let injection: ReturnType<typeof createInjection>;
let sampleProps: SampleProps & SamplePropsInjected;
let secondaryInstance: SecondaryService;

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

class SecondaryComponent extends Component<{ secondaryService: SecondaryService }> {
  public constructor(props: { secondaryService: SecondaryService }) {
    super(props);
    secondaryInstance = props.secondaryService;
  }

  public render() {
    return <p className="sample">{this.props.secondaryService.test}</p>;
  }
}

function init() {
  return {
    div: document.createElement('div'),
    IP: injection.InjectionProvider,
    InjectedComponent: injection.injectComponent<SamplePropsInjected>(injectConfig)(SampleComponent),
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

describe('InjectionProvider', () => {
  it('bind the StateTracker in the right scope if it was not already bound', () => {
    const {
      IP,
    } = init();

    const cnt = new Container();

    shallow(<IP container={cnt}>empty</IP>);

    expect(cnt.isBound(StateTracker)).toBe(true);

    const first = cnt.get<StateTracker>(StateTracker);
    const second = cnt.get<StateTracker>(StateTracker);
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(StateTracker);
  });

  it('does not bind the StateTracker if is was already', () => {
    const {
      IP,
    } = init();

    const cnt = new Container();
    container.bind(StateTracker).toSelf().inSingletonScope();

    shallow(<IP container={cnt}>empty</IP>);

    expect(cnt.getAll<StateTracker>(StateTracker)).toHaveLength(1);
  });
});

describe('injectComponent', () => {
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

  it('updates the component when any service state changes', async () => {
    const {
      div,
    } = init();
    const InjectedComponent = injection.injectComponent({
      secondaryService: SecondaryService,
    })(SecondaryComponent);

    const cnt = new Container();
    cnt.bind(StateTracker).toSelf().inSingletonScope();
    cnt.bind(sampleIdent).to(SampleService).inSingletonScope();
    cnt.bind(SecondaryService).toSelf();

    ReactDOM.render(
      <InjectedComponent container={cnt} />,
      div,
    );

    expect(div.querySelector('.sample')!.textContent).toBe('value1');

    secondaryInstance.setTest('test value');
    await flushPromises();

    expect(div.querySelector('.sample')!.textContent).toBe('test value');

    ReactDOM.unmountComponentAtNode(div);
  });

  it('supports injection of services without binding StateTracker', () => {
    const {
      div,
    } = init();

    @injectable()
    // @ts-ignore
    class TestService {
      public testMethod() {
        return 'test';
      }
    }

    let output: string | undefined;
    let srv: TestService | undefined;
    const TestComp = injection.injectComponent({
      test: TestService,
    })(({ test }: { test: TestService }) => {
      output = test.testMethod();
      srv = test;

      return <p>test</p>;
    });

    const cnt = new Container();
    cnt.bind(TestService).toSelf();

    ReactDOM.render(
      <TestComp container={cnt} />,
      div,
    );

    expect(srv).toBeInstanceOf(TestService);
    expect(output).toBe('test');

    ReactDOM.unmountComponentAtNode(div);
  });
});
