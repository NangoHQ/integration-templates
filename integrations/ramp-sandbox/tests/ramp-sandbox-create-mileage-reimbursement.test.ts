import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-mileage-reimbursement.js';

describe('ramp-sandbox create-mileage-reimbursement tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-mileage-reimbursement',
        Model: 'ActionOutput_ramp_sandbox_createmileagereimbursement'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
