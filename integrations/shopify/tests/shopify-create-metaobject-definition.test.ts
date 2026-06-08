import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-metaobject-definition.js';

describe('shopify create-metaobject-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-metaobject-definition',
        Model: 'ActionOutput_shopify_createmetaobjectdefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
