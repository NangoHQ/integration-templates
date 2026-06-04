import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unpublish-resource.js';

describe('shopify unpublish-resource tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unpublish-resource',
        Model: 'ActionOutput_shopify_unpublishresource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
