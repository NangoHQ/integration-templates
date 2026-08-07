import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-budget-cost-code.js';

describe('ingenious-build create-budget-cost-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-budget-cost-code',
        Model: 'ActionOutput_ingenious_build_createbudgetcostcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
