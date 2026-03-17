import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendar-list.js';

describe('google-calendar list-calendar-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendar-list',
        Model: 'ActionOutput_google_calendar_listcalendarlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
