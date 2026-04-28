import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-invoice.js';

describe('xero create-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-invoice',
        Model: 'ActionOutput_xero_createinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
