import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ledger-voucher.js';

describe('tripletex create-ledger-voucher tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ledger-voucher',
        Model: 'ActionOutput_tripletex_createledgervoucher'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
