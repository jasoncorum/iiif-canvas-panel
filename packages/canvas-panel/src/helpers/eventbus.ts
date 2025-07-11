import { ChoiceDescription } from 'react-iiif-vault';

type EventKey = string | symbol;
type EventHandler<T = any> = (payload: T) => void;
type EventMap = Record<EventKey, EventHandler>;
type Bus<E> = Record<keyof E, E[keyof E][]>;

interface EventBus<T extends EventMap> {
  on<Key extends keyof T>(key: Key, handler: T[Key]): () => void;
  off<Key extends keyof T>(key: Key, handler: T[Key]): void;
  once<Key extends keyof T>(key: Key, handler: T[Key]): void;
  emit<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): void;
}

interface EventBusConfig {
  onError: (...params: any[]) => void;
}

export const choiceEventChannel = eventbus<{
  /**
   * When the `makeChoice` api is called
   *
   * @param payload - the id and options for the choice
   *
   */
  onMakeChoice: (payload: { id: string; options: any }) => void;
  /**
   * When the system identifies that a choice is available
   *
   * @param payload - the id and options for the choice
   *
   */
  onChoiceChange: (payload: {
    choice?: ChoiceDescription;
    partOf?: {
      choiceId?: string;
      canvasId?: string;
      manifestId?: string;
    };
  }) => void;
  /**
   * When a canvas is changed, or a sequence is changed, this signals that
   * the current set of choices should be reset
   *
   */
  onResetSeen: () => void;
}>();

export const errorEventChannel = eventbus<{
  /**
   * When an `error` is fired
   *
   * @param payload - the id and options for the choice
   *
   */
  onErrorEvent: (payload: { message?: string; error: any }) => void;
}>();

export function eventbus<E extends EventMap>(config?: EventBusConfig): EventBus<E> {
  const bus: Partial<Bus<E>> = {};

  const on: EventBus<E>['on'] = (key, handler) => {
    if (bus[key] === undefined) {
      bus[key] = [];
    }
    bus[key]?.push(handler);

    return () => {
      off(key, handler);
    };
  };

  const off: EventBus<E>['off'] = (key, handler) => {
    const index = bus[key]?.indexOf(handler) ?? -1;
    bus[key]?.splice(index >>> 0, 1);
  };

  const once: EventBus<E>['once'] = (key, handler) => {
    const handleOnce = (payload: Parameters<typeof handler>) => {
      handler(payload);
      // TODO: find out a better way to type `handleOnce`
      off(key, handleOnce as typeof handler);
    };

    on(key, handleOnce as typeof handler);
  };

  const emit: EventBus<E>['emit'] = (key, payload) => {
    bus[key]?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        config?.onError(e);
      }
    });
  };

  return { on, off, once, emit };
}
