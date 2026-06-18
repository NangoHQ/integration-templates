import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-price-list.js';

describe('bigcommerce create-price-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-price-list',
        Model: 'ActionOutput_bigcommerce_createpricelist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
