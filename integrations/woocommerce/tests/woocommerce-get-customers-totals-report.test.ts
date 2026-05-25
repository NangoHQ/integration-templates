import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customers-totals-report.js';

describe('woocommerce get-customers-totals-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-customers-totals-report',
        Model: 'ActionOutput_woocommerce_getcustomerstotalsreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
