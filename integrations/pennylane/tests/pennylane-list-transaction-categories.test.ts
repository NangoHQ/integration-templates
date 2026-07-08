import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-transaction-categories.js';

describe('pennylane list-transaction-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-transaction-categories',
        Model: 'ActionOutput_pennylane_listtransactioncategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
