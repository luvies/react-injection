import 'reflect-metadata';

import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Container, injectable } from 'inversify';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { flushPromises, initContainer, sampleIdent, SampleService, SecondaryService } from '../testing/helpers';
import { createInjection } from './create-injection';
import { StateTracker } from './state-tracker';

// Configure enzyme.
Enzyme.configure({ adapter: new Adapter() });

interface SamplePropsInjected {
  sampleService: SampleService;
}

interface SampleProps {
  normalProp: string;
}

interface SecondaryProps {
  secondaryService: SecondaryService;
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

class SecondaryComponent extends Component<SecondaryProps> {
  public constructor(props: SecondaryProps) {
    super(props);
    secondaryInstance = props.secondaryService;
  }

  public render() {
    return <p className="sample">{this.props.secondaryService.test}</p>;
  }
}

class StateMappedComponent extends Component<{ testValue: string }> {
  public constructor(props: { testValue: string }) {
    super(props);
  }

  public render() {
    return <p className="sample">{this.props.testValue}</p>;
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

    const cnt = initContainer();

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

  it('handles state mapping properly', async () => {
    const {
      div,
    } = init();
    const InjectedComponent = injection.injectComponent<SecondaryProps, { testValue: string }>(
      {
        secondaryService: SecondaryService,
      },
      services => ({ testValue: services.secondaryService.test }),
    )(StateMappedComponent);

    const cnt = initContainer();

    ReactDOM.render(
      <InjectedComponent container={cnt} />,
      div,
    );

    expect(div.querySelector('.sample')!.textContent).toBe('value1');

    ReactDOM.unmountComponentAtNode(div);
  });
});
