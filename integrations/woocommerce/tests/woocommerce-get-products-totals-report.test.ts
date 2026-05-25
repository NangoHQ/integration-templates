import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-products-totals-report.js';

describe('woocommerce get-products-totals-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-products-totals-report',
        Model: 'ActionOutput_woocommerce_getproductstotalsreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
