import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ledger-entry.js';

describe('pennylane update-ledger-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ledger-entry',
        Model: 'ActionOutput_pennylane_updateledgerentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
