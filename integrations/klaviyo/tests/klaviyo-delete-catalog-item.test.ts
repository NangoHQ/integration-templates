import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-catalog-item.js';

describe('klaviyo delete-catalog-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-catalog-item',
        Model: 'ActionOutput_klaviyo_deletecatalogitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
