import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-list-entry.js';

describe('attio delete-list-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-list-entry',
        Model: 'ActionOutput_attio_deletelistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
