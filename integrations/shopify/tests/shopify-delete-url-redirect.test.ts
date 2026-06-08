import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-url-redirect.js';

describe('shopify delete-url-redirect tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-url-redirect',
        Model: 'ActionOutput_shopify_deleteurlredirect'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
