import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order-by-identifier.js';

describe('shopify get-order-by-identifier tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order-by-identifier',
        Model: 'ActionOutput_shopify_getorderbyidentifier'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
