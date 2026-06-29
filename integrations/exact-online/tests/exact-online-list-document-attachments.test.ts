import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-document-attachments.js';

describe('exact-online list-document-attachments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-document-attachments',
        Model: 'ActionOutput_exact_online_listdocumentattachments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
