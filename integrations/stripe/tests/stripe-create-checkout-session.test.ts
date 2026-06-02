import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-checkout-session.js';

describe('stripe create-checkout-session tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-checkout-session',
        Model: 'ActionOutput_stripe_createcheckoutsession'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
