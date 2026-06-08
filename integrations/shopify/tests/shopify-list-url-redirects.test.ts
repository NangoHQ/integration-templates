import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-url-redirects.js';

describe('shopify list-url-redirects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-url-redirects',
        Model: 'ActionOutput_shopify_listurlredirects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
