import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-about.js';

describe('google-drive get-about tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-about',
        Model: 'ActionOutput_google_drive_getabout'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
