import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-item-prices.js';

describe('chargebee list-item-prices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-item-prices',
        Model: 'ActionOutput_chargebee_listitemprices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
