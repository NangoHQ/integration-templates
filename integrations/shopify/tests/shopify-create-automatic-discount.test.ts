import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-automatic-discount.js';

describe('shopify create-automatic-discount tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-automatic-discount',
        Model: 'ActionOutput_shopify_createautomaticdiscount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
