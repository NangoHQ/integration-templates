import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-cached-contents.js';

describe('google-gemini list-cached-contents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-cached-contents',
        Model: 'ActionOutput_google_gemini_listcachedcontents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
