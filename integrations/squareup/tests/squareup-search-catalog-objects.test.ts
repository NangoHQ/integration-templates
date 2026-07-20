import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-catalog-objects.js';

describe('squareup search-catalog-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-catalog-objects',
        Model: 'ActionOutput_squareup_searchcatalogobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
