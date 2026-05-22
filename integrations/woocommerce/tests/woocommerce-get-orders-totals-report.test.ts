import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-orders-totals-report.js';

describe('woocommerce get-orders-totals-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-orders-totals-report',
        Model: 'ActionOutput_woocommerce_getorderstotalsreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
