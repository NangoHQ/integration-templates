import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-calendar-from-list.js';

describe('google-calendar remove-calendar-from-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-calendar-from-list',
        Model: 'ActionOutput_google_calendar_removecalendarfromlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
