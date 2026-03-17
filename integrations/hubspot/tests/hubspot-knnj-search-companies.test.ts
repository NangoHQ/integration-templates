import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-companies.js';

describe('hubspot-knnj search-companies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-companies',
        Model: 'ActionOutput_hubspot_knnj_searchcompanies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
