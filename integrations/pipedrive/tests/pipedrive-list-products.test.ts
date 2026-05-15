import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-products.js';

describe('pipedrive list-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-products',
        Model: 'ActionOutput_pipedrive_listproducts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
