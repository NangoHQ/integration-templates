import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-sites.js';

describe('sharepoint-online search-sites tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-sites',
        Model: 'ActionOutput_sharepoint_online_searchsites'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
