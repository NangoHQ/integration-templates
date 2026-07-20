import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-transactions.js';

describe('shopify-partner list-transactions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-transactions',
        Model: 'ActionOutput_shopify_partner_listtransactions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
