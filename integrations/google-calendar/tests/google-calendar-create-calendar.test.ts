import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-calendar.js';

describe('google-calendar create-calendar tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-calendar',
        Model: 'ActionOutput_google_calendar_createcalendar'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
