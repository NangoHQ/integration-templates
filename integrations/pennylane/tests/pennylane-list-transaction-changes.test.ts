import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-transaction-changes.js';

describe('pennylane list-transaction-changes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-transaction-changes',
        Model: 'ActionOutput_pennylane_listtransactionchanges'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
