import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-subscription.js';

describe('paypal create-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-subscription',
        Model: 'ActionOutput_paypal_sandbox_createsubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
