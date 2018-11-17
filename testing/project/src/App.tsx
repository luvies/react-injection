import React, { Component } from 'react';
import './App.css';
import { injectComponent } from './di';
import { InjectableProps } from './injection';
import Internal from './Internal';
import { SampleService } from './sample-service';

interface Props {
  sample: SampleService;
}

class App extends Component<Props> {
  public render() {
    return (
      <div>
        <p>{this.props.sample.sample}</p>
        <button onClick={this.handleClick}>btn</button>
        {this.props.sample.show &&
          <Internal />
        }
      </div>
    );
  }

  private handleClick = () => {
    this.props.sample.setSample('new');
  }
}

export default injectComponent<InjectableProps<Props>>({
  sample: SampleService,
})(App);
