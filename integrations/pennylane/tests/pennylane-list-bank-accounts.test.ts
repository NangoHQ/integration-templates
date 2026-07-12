import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-bank-accounts.js';

describe('pennylane list-bank-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-bank-accounts',
        Model: 'ActionOutput_pennylane_listbankaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
