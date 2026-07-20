import { expect, it, describe } from 'vitest';

import createAction from '../actions/suggest-geo-target-constants.js';

describe('google-ads suggest-geo-target-constants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'suggest-geo-target-constants',
        Model: 'ActionOutput_google_ads_suggestgeotargetconstants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
