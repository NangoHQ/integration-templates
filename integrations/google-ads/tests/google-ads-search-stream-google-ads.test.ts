import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-stream-google-ads.js';

describe('google-ads search-stream-google-ads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-stream-google-ads',
        Model: 'ActionOutput_google_ads_searchstreamgoogleads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
