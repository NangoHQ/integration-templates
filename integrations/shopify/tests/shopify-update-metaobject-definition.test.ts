import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-metaobject-definition.js';

describe('shopify update-metaobject-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-metaobject-definition',
        Model: 'ActionOutput_shopify_updatemetaobjectdefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
