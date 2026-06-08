import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-abandoned-checkouts.js';

describe('shopify list-abandoned-checkouts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-abandoned-checkouts',
        Model: 'ActionOutput_shopify_listabandonedcheckouts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
