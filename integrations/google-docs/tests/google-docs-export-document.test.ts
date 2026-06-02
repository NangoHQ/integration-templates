import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/export-document.js';

describe('google-docs export-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'export-document',
        Model: 'ActionOutput_google_docs_exportdocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
