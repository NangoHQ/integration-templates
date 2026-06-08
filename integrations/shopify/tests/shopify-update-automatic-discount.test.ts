import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-automatic-discount.js';

describe('shopify update-automatic-discount tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-automatic-discount',
        Model: 'ActionOutput_shopify_updateautomaticdiscount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
