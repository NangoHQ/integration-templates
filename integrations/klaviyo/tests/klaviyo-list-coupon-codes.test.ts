import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-coupon-codes.js';

describe('klaviyo list-coupon-codes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-coupon-codes',
        Model: 'ActionOutput_klaviyo_listcouponcodes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
