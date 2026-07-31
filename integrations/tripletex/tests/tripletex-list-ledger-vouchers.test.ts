import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ledger-vouchers.js';

describe('tripletex list-ledger-vouchers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ledger-vouchers',
        Model: 'ActionOutput_tripletex_listledgervouchers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
