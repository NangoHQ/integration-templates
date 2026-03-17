import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/watch-events.js';

describe('google-calendar watch-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'watch-events',
        Model: 'ActionOutput_google_calendar_watchevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
