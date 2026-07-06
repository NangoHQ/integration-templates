import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-coupon-code.js';

describe('klaviyo delete-coupon-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-coupon-code',
        Model: 'ActionOutput_klaviyo_deletecouponcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
