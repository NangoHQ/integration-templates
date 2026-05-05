import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-bill.js';

describe('quickbooks get-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-bill',
        Model: 'ActionOutput_quickbooks_sandbox_getbill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
