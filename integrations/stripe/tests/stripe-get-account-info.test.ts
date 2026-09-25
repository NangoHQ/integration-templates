import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-account-info.js';

describe('stripe get-account-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-account-info',
        Model: 'ActionOutput_stripe_getaccountinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
