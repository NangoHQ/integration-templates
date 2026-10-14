import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-banking-accounts.js';

describe('ramp-sandbox list-banking-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-banking-accounts',
        Model: 'ActionOutput_ramp_sandbox_listbankingaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
