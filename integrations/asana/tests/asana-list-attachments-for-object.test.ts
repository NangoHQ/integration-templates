import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-attachments-for-object.js';

describe('asana list-attachments-for-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-attachments-for-object',
        Model: 'ActionOutput_asana_listattachmentsforobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
