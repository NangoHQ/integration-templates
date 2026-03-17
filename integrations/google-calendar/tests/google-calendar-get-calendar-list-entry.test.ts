import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-calendar-list-entry.js';

describe('google-calendar get-calendar-list-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-calendar-list-entry',
        Model: 'ActionOutput_google_calendar_getcalendarlistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
