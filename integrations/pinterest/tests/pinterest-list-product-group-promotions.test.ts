import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-product-group-promotions.js';

describe('pinterest list-product-group-promotions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-product-group-promotions',
        Model: 'ActionOutput_pinterest_listproductgrouppromotions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
