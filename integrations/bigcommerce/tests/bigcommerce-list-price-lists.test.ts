import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-price-lists.js';

describe('bigcommerce list-price-lists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-price-lists',
        Model: 'ActionOutput_bigcommerce_listpricelists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
