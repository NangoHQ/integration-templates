import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/embed-content.js';

describe('google-gemini embed-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'embed-content',
        Model: 'ActionOutput_google_gemini_embedcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
