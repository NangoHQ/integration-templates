import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-document-style.js';

describe('google-docs update-document-style tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-document-style',
        Model: 'ActionOutput_google_docs_updatedocumentstyle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
