import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-list-entry.js';

describe('attio get-list-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-list-entry',
        Model: 'ActionOutput_attio_getlistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
