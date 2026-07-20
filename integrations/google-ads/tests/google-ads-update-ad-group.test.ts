import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-ad-group.js';

describe('google-ads update-ad-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ad-group',
        Model: 'ActionOutput_google_ads_updateadgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
