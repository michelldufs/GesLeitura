export {};

declare global {
  interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<unknown> | unknown): void;
  }
}
