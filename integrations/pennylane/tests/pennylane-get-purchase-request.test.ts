import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-purchase-request.js';

describe('pennylane get-purchase-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-purchase-request',
        Model: 'ActionOutput_pennylane_getpurchaserequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
