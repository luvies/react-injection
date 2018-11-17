import React, { Component } from 'react';
import { injectComponent } from './di';
import { InjectableProps } from './injection';
import { SampleService } from './sample-service';

interface Props {
  sample: SampleService;
}

interface State {
  text: string;
}

class Internal extends Component<Props, State> {
  public state: State = {
    text: 'base',
  };

  private cancelUpdate = false;

  public componentWillUnmount() {
    this.cancelUpdate = true;
  }

  public render() {
    return (
      <>
        <p>{this.state.text}</p>
        <button onClick={this.handleClick}>test</button>
      </>
    );
  }

  private handleClick = () => {
    Promise.resolve()
      .then(() => {
        this.props.sample.setShow(false);
        this.setState({
          text: 'change',
        });
      });
  }
}

export default injectComponent<InjectableProps<Props>>({
  sample: SampleService,
})(Internal);
