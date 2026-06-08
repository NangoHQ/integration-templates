import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-metafield-definitions.js';

describe('shopify list-metafield-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-metafield-definitions',
        Model: 'ActionOutput_shopify_listmetafielddefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
