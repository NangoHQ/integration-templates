import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-metafield-definition.js';

describe('shopify update-metafield-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-metafield-definition',
        Model: 'ActionOutput_shopify_updatemetafielddefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
