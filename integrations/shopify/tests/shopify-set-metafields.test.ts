import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-metafields.js';

describe('shopify set-metafields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-metafields',
        Model: 'ActionOutput_shopify_setmetafields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
