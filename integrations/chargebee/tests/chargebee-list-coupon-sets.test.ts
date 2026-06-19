import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-coupon-sets.js';

describe('chargebee list-coupon-sets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-coupon-sets',
        Model: 'ActionOutput_chargebee_listcouponsets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
