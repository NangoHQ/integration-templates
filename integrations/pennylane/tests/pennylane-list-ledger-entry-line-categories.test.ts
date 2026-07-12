import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ledger-entry-line-categories.js';

describe('pennylane list-ledger-entry-line-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ledger-entry-line-categories',
        Model: 'ActionOutput_pennylane_listledgerentrylinecategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
