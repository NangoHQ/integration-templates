import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-automatic-discount.js';

describe('shopify delete-automatic-discount tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-automatic-discount',
        Model: 'ActionOutput_shopify_deleteautomaticdiscount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
