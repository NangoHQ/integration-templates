import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-metaobject-definition.js';

describe('shopify delete-metaobject-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-metaobject-definition',
        Model: 'ActionOutput_shopify_deletemetaobjectdefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
