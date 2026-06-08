import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-expense.js';

describe('splitwise update-expense tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-expense',
        Model: 'ActionOutput_splitwise_updateexpense'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
