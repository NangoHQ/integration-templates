import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ledger-entry.js';

describe('pennylane get-ledger-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ledger-entry',
        Model: 'ActionOutput_pennylane_getledgerentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
