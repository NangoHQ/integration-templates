import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/stop-watch.js';

describe('google-mail stop-watch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'stop-watch',
        Model: 'ActionOutput_google_mail_stopwatch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
