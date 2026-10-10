import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-product.js';

describe('zoho-bigin upsert-product tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-product',
        Model: 'ActionOutput_zoho_bigin_upsertproduct'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
