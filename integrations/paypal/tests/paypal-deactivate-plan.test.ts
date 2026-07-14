import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-plan.js';

describe('paypal deactivate-plan tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-plan',
        Model: 'ActionOutput_paypal_sandbox_deactivateplan'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
