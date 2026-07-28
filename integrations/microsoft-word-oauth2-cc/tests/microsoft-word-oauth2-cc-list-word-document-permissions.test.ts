import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-word-document-permissions.js';

describe('microsoft-word-oauth2-cc list-word-document-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-word-document-permissions',
        Model: 'ActionOutput_microsoft_word_oauth2_cc_listworddocumentpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
