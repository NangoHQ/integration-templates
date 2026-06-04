import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-metaobject.js';

describe('shopify update-metaobject tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-metaobject',
        Model: 'ActionOutput_shopify_updatemetaobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
