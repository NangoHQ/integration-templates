import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-bank-account.js';

describe('pennylane create-bank-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-bank-account',
        Model: 'ActionOutput_pennylane_createbankaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
