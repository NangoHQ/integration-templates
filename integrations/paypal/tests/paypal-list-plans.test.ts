import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-plans.js';

describe('paypal list-plans tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-plans',
        Model: 'ActionOutput_paypal_sandbox_listplans'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
