import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ledger-account.js';

describe('pennylane get-ledger-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ledger-account',
        Model: 'ActionOutput_pennylane_getledgeraccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
