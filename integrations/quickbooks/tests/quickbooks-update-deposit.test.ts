import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-deposit.js';

describe('quickbooks update-deposit tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-deposit',
        Model: 'ActionOutput_quickbooks_sandbox_updatedeposit'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
