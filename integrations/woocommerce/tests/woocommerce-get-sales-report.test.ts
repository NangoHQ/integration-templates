import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sales-report.js';

describe('woocommerce get-sales-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sales-report',
        Model: 'ActionOutput_woocommerce_getsalesreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
