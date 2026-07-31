import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-word-document-versions.js';

describe('microsoft-word-oauth2-cc list-word-document-versions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-word-document-versions',
        Model: 'ActionOutput_microsoft_word_oauth2_cc_listworddocumentversions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
