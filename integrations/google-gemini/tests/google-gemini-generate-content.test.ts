import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/generate-content.js';

describe('google-gemini generate-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'generate-content',
        Model: 'ActionOutput_google_gemini_generatecontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
