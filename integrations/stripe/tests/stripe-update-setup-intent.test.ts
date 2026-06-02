import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-setup-intent.js';

describe('stripe update-setup-intent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-setup-intent',
        Model: 'ActionOutput_stripe_updatesetupintent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
