import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/quick-add-event.js';

describe('google-calendar quick-add-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'quick-add-event',
        Model: 'ActionOutput_google_calendar_quickaddevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
