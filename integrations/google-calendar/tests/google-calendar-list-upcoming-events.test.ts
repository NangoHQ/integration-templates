import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-upcoming-events.js';

describe('google-calendar list-upcoming-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-upcoming-events',
        Model: 'ActionOutput_google_calendar_listupcomingevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
