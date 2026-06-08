import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-url-redirect.js';

describe('shopify update-url-redirect tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-url-redirect',
        Model: 'ActionOutput_shopify_updateurlredirect'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
