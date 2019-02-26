import { Container } from 'inversify';
import { Context, useContext, useEffect, useMemo, useState } from 'react';
import { InjectableProps } from './create-injection';
import { StateTracker } from './state-tracker';

export function useInjection<T>(
  context: Context<Container | undefined> | Context<Container>,
  inject: InjectableProps<T>,
): T {
  const container = useContext<Container | undefined>(context as any);

  if (!container) {
    throw new Error('No container was provided in context');
  }

  // Use an empty state to allow us to trigger updates on command.
  const [, setTrigger] = useState({});

  // After render, start listening to state updates.
  // We also need to stop listening on cleanup.
  useEffect(() => {
    const doUpdate = () => setTrigger({});

    const stateTracker = container.get(StateTracker);
    stateTracker.handlers.add(doUpdate);

    return () => {
      stateTracker.handlers.delete(doUpdate);
    };
  });

  // We don't need to re-get the services if the object defining them hasn't changed.
  const services = useMemo(() => {
    const srv: T = {} as any;
    for (const key of (Object.keys(inject) as Array<keyof typeof inject>)) {
      srv[key] = container.get(inject[key]);
    }

    return srv;
  }, [inject]);

  return services;
}
