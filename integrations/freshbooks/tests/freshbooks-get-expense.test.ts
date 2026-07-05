import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-expense.js';

describe('freshbooks get-expense tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-expense',
        Model: 'ActionOutput_freshbooks_getexpense'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
