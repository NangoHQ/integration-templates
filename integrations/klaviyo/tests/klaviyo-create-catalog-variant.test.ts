import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-catalog-variant.js';

describe('klaviyo create-catalog-variant tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-catalog-variant',
        Model: 'ActionOutput_klaviyo_createcatalogvariant'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
