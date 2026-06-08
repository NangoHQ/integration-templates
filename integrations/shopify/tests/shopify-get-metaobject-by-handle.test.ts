import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-metaobject-by-handle.js';

describe('shopify get-metaobject-by-handle tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-metaobject-by-handle',
        Model: 'ActionOutput_shopify_getmetaobjectbyhandle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
