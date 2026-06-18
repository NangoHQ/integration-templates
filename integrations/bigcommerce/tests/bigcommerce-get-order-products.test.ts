import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order-products.js';

describe('bigcommerce get-order-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order-products',
        Model: 'ActionOutput_bigcommerce_getorderproducts'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockResolvedValue({
            credentials: {
                access_token: 'fermiatee6aufil63xw3o6e85lo0wwx'
            }
        });
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
