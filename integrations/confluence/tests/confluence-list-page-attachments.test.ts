import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-page-attachments.js';

describe('confluence list-page-attachments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-page-attachments',
        Model: 'ActionOutput_confluence_listpageattachments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
