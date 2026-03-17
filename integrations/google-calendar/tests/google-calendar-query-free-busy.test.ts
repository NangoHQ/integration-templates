import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-free-busy.js';

describe('google-calendar query-free-busy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-free-busy',
        Model: 'ActionOutput_google_calendar_queryfreebusy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
