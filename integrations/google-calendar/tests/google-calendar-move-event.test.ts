import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-event.js';

describe('google-calendar move-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-event',
        Model: 'ActionOutput_google_calendar_moveevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
