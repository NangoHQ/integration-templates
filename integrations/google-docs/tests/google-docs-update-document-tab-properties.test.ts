import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-document-tab-properties.js';

describe('google-docs update-document-tab-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-document-tab-properties',
        Model: 'ActionOutput_google_docs_updatedocumenttabproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
