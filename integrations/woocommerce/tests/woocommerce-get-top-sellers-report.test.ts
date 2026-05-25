import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-top-sellers-report.js';

describe('woocommerce get-top-sellers-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-top-sellers-report',
        Model: 'ActionOutput_woocommerce_gettopsellersreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
