import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/categorize-transaction.js';

describe('pennylane categorize-transaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'categorize-transaction',
        Model: 'ActionOutput_pennylane_categorizetransaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
