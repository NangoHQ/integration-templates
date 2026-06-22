import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-coupons.js';

describe('chargebee list-coupons tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-coupons',
        Model: 'ActionOutput_chargebee_listcoupons'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
