import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-data-stream.js';

describe('google-analytics create-data-stream tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-data-stream',
        Model: 'ActionOutput_google_analytics_createdatastream'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
