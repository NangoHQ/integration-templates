import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ledger-account.js';

describe('pennylane create-ledger-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ledger-account',
        Model: 'ActionOutput_pennylane_createledgeraccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
