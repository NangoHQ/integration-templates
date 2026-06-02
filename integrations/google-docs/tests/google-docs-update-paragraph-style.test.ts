import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-paragraph-style.js';

describe('google-docs update-paragraph-style tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-paragraph-style',
        Model: 'ActionOutput_google_docs_updateparagraphstyle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
