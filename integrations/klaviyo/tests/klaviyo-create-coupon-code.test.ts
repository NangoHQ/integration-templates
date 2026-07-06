import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-coupon-code.js';

describe('klaviyo create-coupon-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-coupon-code',
        Model: 'ActionOutput_klaviyo_createcouponcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
