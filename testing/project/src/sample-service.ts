import { injectable } from 'inversify';
import { ReactiveService } from './injection';

interface State {
  sample: string;
  show: boolean;
}

@injectable()
export class SampleService extends ReactiveService<State> {
  protected state: State = {
    sample: 'test',
    show: true,
  };

  public get sample(): string {
    return this.state.sample;
  }

  public get show(): boolean {
    return this.state.show;
  }

  public setSample(sample: string) {
    this.setState({
      sample,
    });
  }

  public setShow(show: boolean) {
    this.setState({
      show,
    });
  }
}
