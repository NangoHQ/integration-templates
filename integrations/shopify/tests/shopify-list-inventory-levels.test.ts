import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-inventory-levels.js';

describe('shopify list-inventory-levels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-inventory-levels',
        Model: 'ActionOutput_shopify_listinventorylevels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
