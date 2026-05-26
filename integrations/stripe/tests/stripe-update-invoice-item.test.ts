import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-invoice-item.js';

describe('stripe update-invoice-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-invoice-item',
        Model: 'ActionOutput_stripe_updateinvoiceitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
