import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/link-ledger-entry-line-categories.js';

describe('pennylane link-ledger-entry-line-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-ledger-entry-line-categories',
        Model: 'ActionOutput_pennylane_linkledgerentrylinecategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
