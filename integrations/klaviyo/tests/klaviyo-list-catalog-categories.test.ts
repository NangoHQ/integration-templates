import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-catalog-categories.js';

describe('klaviyo list-catalog-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-catalog-categories',
        Model: 'ActionOutput_klaviyo_listcatalogcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
