export {};

declare global {
  var vitest: {
    NangoSyncMock: new (config: { name: string; Model: string }) => any;
  };
}
