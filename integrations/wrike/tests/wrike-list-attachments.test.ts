import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-attachments.js';

describe('wrike list-attachments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-attachments',
        Model: 'ActionOutput_wrike_listattachments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
