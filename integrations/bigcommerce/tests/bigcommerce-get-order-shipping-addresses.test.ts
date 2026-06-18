import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order-shipping-addresses.js';

describe('bigcommerce get-order-shipping-addresses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order-shipping-addresses',
        Model: 'ActionOutput_bigcommerce_getordershippingaddresses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
