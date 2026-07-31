import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-drive.js';

describe('microsoft-word-oauth2-cc get-user-drive tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-drive',
        Model: 'ActionOutput_microsoft_word_oauth2_cc_getuserdrive'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
