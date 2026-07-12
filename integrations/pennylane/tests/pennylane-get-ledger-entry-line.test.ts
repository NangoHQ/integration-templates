import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ledger-entry-line.js';

describe('pennylane get-ledger-entry-line tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ledger-entry-line',
        Model: 'ActionOutput_pennylane_getledgerentryline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
