import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-setup-intent.js';

describe('stripe create-setup-intent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-setup-intent',
        Model: 'ActionOutput_stripe_createsetupintent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
