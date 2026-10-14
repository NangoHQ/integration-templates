import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-reimbursement.js';

describe('ramp-sandbox get-reimbursement tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-reimbursement',
        Model: 'ActionOutput_ramp_sandbox_getreimbursement'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
