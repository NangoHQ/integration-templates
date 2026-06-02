import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-paragraph-bullets.js';

describe('google-docs create-paragraph-bullets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-paragraph-bullets',
        Model: 'ActionOutput_google_docs_createparagraphbullets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
