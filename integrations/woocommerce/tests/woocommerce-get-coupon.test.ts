import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-coupon.js';

describe('woocommerce get-coupon tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-coupon',
        Model: 'ActionOutput_woocommerce_getcoupon'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
