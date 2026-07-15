import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-google-ads.js';

describe('google-ads search-google-ads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-google-ads',
        Model: 'ActionOutput_google_ads_searchgoogleads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
