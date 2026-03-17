import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-attendee.js';

describe('google-calendar add-attendee tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-attendee',
        Model: 'ActionOutput_google_calendar_addattendee'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
