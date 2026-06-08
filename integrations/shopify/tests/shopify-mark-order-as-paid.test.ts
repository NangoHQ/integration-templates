import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-order-as-paid.js';

describe('shopify mark-order-as-paid tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-order-as-paid',
        Model: 'ActionOutput_shopify_markorderaspaid'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
