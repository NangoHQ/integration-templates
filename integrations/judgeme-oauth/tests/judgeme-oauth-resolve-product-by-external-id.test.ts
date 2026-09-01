import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resolve-product-by-external-id.js';

describe('judgeme-oauth resolve-product-by-external-id tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resolve-product-by-external-id',
        Model: 'ActionOutput_judgeme_oauth_resolveproductbyexternalid'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
