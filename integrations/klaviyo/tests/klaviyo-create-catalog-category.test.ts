import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-catalog-category.js';

describe('klaviyo create-catalog-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-catalog-category',
        Model: 'ActionOutput_klaviyo_createcatalogcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
