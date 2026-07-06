import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-catalog-category.js';

describe('klaviyo delete-catalog-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-catalog-category',
        Model: 'ActionOutput_klaviyo_deletecatalogcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
