if (typeof globalThis !== 'undefined') {
  (globalThis as any).window = globalThis;
} else if (typeof self !== 'undefined') {
  (self as any).window = self;
}
