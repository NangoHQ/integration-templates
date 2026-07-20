import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-order-tracking.js';

describe('paypal add-order-tracking tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-order-tracking',
        Model: 'ActionOutput_paypal_sandbox_addordertracking'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
