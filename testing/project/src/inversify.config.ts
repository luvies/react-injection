import { Container } from 'inversify';
import { SampleService } from './sample-service';

export function configure() {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  container.bind(SampleService).toSelf();

  return container;
}
