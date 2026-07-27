import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/stop-bulk-file.js';

describe('millionverifier stop-bulk-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'stop-bulk-file',
        Model: 'ActionOutput_millionverifier_stopbulkfile'
    });

    nangoMock.getToken = vi.fn(() =>
        Promise.resolve({
            type: 'API_KEY',
            apiKey: 'sUNP7MED5Nh53nz8SgvLvvY9e'
        })
    );

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
