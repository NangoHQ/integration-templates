import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unletter-ledger-entry-lines.js';

describe('pennylane unletter-ledger-entry-lines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unletter-ledger-entry-lines',
        Model: 'ActionOutput_pennylane_unletterledgerentrylines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
