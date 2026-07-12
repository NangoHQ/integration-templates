import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-transaction.js';

describe('pennylane create-transaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-transaction',
        Model: 'ActionOutput_pennylane_createtransaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
