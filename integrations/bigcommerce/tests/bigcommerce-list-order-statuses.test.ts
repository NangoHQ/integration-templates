import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-order-statuses.js';

describe('bigcommerce list-order-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-order-statuses',
        Model: 'ActionOutput_bigcommerce_listorderstatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
