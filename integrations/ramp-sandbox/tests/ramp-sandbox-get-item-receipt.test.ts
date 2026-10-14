import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-item-receipt.js';

describe('ramp-sandbox get-item-receipt tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-item-receipt',
        Model: 'ActionOutput_ramp_sandbox_getitemreceipt'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
