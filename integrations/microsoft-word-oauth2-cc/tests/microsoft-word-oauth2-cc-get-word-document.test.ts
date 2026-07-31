import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-word-document.js';

describe('microsoft-word-oauth2-cc get-word-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-word-document',
        Model: 'ActionOutput_microsoft_word_oauth2_cc_getworddocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
