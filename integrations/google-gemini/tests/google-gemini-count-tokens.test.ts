import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/count-tokens.js';

describe('google-gemini count-tokens tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'count-tokens',
        Model: 'ActionOutput_google_gemini_counttokens'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
