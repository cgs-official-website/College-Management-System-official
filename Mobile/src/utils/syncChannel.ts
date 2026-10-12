// Tiny in-app pub/sub (replacement for the web BroadcastChannel / cross-tab sync).
type Handler<T = any> = (payload: T) => void;
const topics = new Map<string, Set<Handler>>();

export const syncChannel = {
  subscribe<T = any>(topic: string, handler: Handler<T>): () => void {
    if (!topics.has(topic)) topics.set(topic, new Set());
    topics.get(topic)!.add(handler);
    return () => {
      topics.get(topic)?.delete(handler);
    };
  },
  publish<T = any>(topic: string, payload?: T): void {
    topics.get(topic)?.forEach((h) => h(payload));
  },
};
