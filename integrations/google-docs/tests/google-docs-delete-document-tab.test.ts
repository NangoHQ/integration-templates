import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-document-tab.js';

describe('google-docs delete-document-tab tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-document-tab',
        Model: 'ActionOutput_google_docs_deletedocumenttab'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
