import { useEffect, useState } from 'react';

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const EMPTY: unknown[] = [];

/**
 * Minimal fetch-on-mount hook. The project deliberately has no TanStack Query,
 * so this keeps the service-layer call pattern in one place.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = EMPTY): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((e: unknown) =>
        active &&
        setState({
          data: null,
          error: e instanceof Error ? e.message : 'Something went wrong',
          loading: false,
        }),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
