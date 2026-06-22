import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-customer.js';

describe('chargebee delete-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-customer',
        Model: 'ActionOutput_chargebee_deletecustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
