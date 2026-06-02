import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-prices.js';

describe('stripe list-prices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-prices',
        Model: 'ActionOutput_stripe_listprices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
