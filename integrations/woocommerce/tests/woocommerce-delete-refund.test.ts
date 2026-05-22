import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-refund.js';

describe('woocommerce delete-refund tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-refund',
        Model: 'ActionOutput_woocommerce_deleterefund'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
