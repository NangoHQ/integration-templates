import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-word-document-metadata.js';

describe('microsoft-word-oauth2-cc update-word-document-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-word-document-metadata',
        Model: 'ActionOutput_microsoft_word_oauth2_cc_updateworddocumentmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
