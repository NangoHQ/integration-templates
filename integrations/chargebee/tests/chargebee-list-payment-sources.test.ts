import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-payment-sources.js';

describe('chargebee list-payment-sources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-payment-sources',
        Model: 'ActionOutput_chargebee_listpaymentsources'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
