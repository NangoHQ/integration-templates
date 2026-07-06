import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-catalog-variant.js';

describe('klaviyo delete-catalog-variant tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-catalog-variant',
        Model: 'ActionOutput_klaviyo_deletecatalogvariant'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
