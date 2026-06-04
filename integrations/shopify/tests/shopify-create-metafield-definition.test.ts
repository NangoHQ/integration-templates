import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-metafield-definition.js';

describe('shopify create-metafield-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-metafield-definition',
        Model: 'ActionOutput_shopify_createmetafielddefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
