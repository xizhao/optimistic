/// <reference types="immutable"/>

declare module 'optimistic' {
  import __Immutable = Immutable;

  export = Optimistic;

  class Optimistic<T> {
    value: T;

    constructor(value: T);

    update(f: (before: __Immutable.Map<string, any>) => __Immutable.Map<string, any>): T;

    pushUpdate(f: (value: __Immutable.Map<string, any>, resolvedValue?: T) => T, deferResolve?: boolean);

    emit(event: 'change', value: T, resolvedUpdates: Array<Optimistic.ResolvedUpdate<T>>, loading?: boolean);

    on(event: 'change', handler: (value: T, resolvedUpdates: Array<Optimistic.ResolvedUpdate<T>>, loading: boolean) => void);
  }

  namespace Optimistic {
    export type ResolvedUpdate<T> = {
      succeeded: true,
      value: T
    } | {
      succeeded: false,
      value: any
    }
  }
}