import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-metaobject.js';

describe('shopify delete-metaobject tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-metaobject',
        Model: 'ActionOutput_shopify_deletemetaobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
