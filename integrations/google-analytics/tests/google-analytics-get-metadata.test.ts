import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-metadata.js';

describe('google-analytics get-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-metadata',
        Model: 'ActionOutput_google_analytics_getmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
