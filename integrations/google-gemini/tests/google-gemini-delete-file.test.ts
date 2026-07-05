import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-file.js';

describe('google-gemini delete-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-file',
        Model: 'ActionOutput_google_gemini_deletefile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
