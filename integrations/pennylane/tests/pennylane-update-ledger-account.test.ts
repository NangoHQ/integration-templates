import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ledger-account.js';

describe('pennylane update-ledger-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ledger-account',
        Model: 'ActionOutput_pennylane_updateledgeraccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
