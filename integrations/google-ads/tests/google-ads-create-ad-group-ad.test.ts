import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-ad-group-ad.js';

describe('google-ads create-ad-group-ad tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ad-group-ad',
        Model: 'ActionOutput_google_ads_createadgroupad'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
