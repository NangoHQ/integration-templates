import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-addresses.js';

describe('bigcommerce list-customer-addresses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-addresses',
        Model: 'ActionOutput_bigcommerce_listcustomeraddresses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
