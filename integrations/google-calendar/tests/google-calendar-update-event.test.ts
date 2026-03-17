import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-event.js';

describe('google-calendar update-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-event',
        Model: 'ActionOutput_google_calendar_updateevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
