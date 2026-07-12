import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ledger-entry-lines.js';

describe('pennylane list-ledger-entry-lines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ledger-entry-lines',
        Model: 'ActionOutput_pennylane_listledgerentrylines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
