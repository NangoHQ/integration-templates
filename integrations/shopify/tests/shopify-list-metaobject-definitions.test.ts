import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-metaobject-definitions.js';

describe('shopify list-metaobject-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-metaobject-definitions',
        Model: 'ActionOutput_shopify_listmetaobjectdefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
