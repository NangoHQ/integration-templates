import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-free-slots.js';

describe('google-calendar find-free-slots tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-free-slots',
        Model: 'ActionOutput_google_calendar_findfreeslots'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
