import { expect, it, describe } from 'vitest';

import createAction from '../actions/remove-ad-group-ad.js';

describe('google-ads remove-ad-group-ad tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-ad-group-ad',
        Model: 'ActionOutput_google_ads_removeadgroupad'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
