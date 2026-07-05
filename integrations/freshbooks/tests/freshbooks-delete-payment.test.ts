import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-payment.js';

describe('freshbooks delete-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-payment',
        Model: 'ActionOutput_freshbooks_deletepayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
