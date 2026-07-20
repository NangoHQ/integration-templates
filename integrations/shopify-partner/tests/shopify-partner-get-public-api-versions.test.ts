import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-public-api-versions.js';

describe('shopify-partner get-public-api-versions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-public-api-versions',
        Model: 'ActionOutput_shopify_partner_getpublicapiversions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
