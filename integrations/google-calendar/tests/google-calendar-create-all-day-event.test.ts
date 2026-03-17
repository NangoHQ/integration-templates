import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-all-day-event.js';

describe('google-calendar create-all-day-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-all-day-event',
        Model: 'ActionOutput_google_calendar_createalldayevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
