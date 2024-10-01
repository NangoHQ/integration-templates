export {};

declare global {
    var vitest: {
        NangoSyncMock: new (config: { dirname: string; name: string; Model: string }) => any;
    };
}
