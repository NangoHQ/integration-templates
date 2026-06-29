import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-product-variants.js';

describe('bigcommerce list-product-variants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-product-variants',
        Model: 'ActionOutput_bigcommerce_listproductvariants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
