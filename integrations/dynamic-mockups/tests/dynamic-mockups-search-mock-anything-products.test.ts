import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-mock-anything-products.js';

describe('dynamic-mockups search-mock-anything-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-mock-anything-products',
        Model: 'ActionOutput_dynamic_mockups_searchmockanythingproducts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
