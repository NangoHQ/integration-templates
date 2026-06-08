import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-fulfillment.js';

describe('shopify cancel-fulfillment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-fulfillment',
        Model: 'ActionOutput_shopify_cancelfulfillment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
