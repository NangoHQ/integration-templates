import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-metaobjects.js';

describe('shopify list-metaobjects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-metaobjects',
        Model: 'ActionOutput_shopify_listmetaobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
