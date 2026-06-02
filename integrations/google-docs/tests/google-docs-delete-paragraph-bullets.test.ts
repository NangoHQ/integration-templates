import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-paragraph-bullets.js';

describe('google-docs delete-paragraph-bullets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-paragraph-bullets',
        Model: 'ActionOutput_google_docs_deleteparagraphbullets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
