import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-checkout-sessions.js';

describe('stripe list-checkout-sessions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-checkout-sessions',
        Model: 'ActionOutput_stripe_listcheckoutsessions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
