import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-plan-pricing.js';

describe('paypal update-plan-pricing tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-plan-pricing',
        Model: 'ActionOutput_paypal_sandbox_updateplanpricing'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
