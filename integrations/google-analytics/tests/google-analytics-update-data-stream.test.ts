import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-data-stream.js';

describe('google-analytics update-data-stream tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-data-stream',
        Model: 'ActionOutput_google_analytics_updatedatastream'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
