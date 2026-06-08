import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-metafield-definition.js';

describe('shopify delete-metafield-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-metafield-definition',
        Model: 'ActionOutput_shopify_deletemetafielddefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
