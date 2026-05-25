import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-conversion-event.js';

describe('google-analytics create-conversion-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-conversion-event',
        Model: 'ActionOutput_google_analytics_createconversionevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
