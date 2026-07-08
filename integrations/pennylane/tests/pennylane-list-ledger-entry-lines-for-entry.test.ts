import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ledger-entry-lines-for-entry.js';

describe('pennylane list-ledger-entry-lines-for-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ledger-entry-lines-for-entry',
        Model: 'ActionOutput_pennylane_listledgerentrylinesforentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
