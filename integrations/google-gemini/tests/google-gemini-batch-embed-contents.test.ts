import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-embed-contents.js';

describe('google-gemini batch-embed-contents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-embed-contents',
        Model: 'ActionOutput_google_gemini_batchembedcontents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
