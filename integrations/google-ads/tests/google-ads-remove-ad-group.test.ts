import { expect, it, describe } from 'vitest';

import createAction from '../actions/remove-ad-group.js';

describe('google-ads remove-ad-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-ad-group',
        Model: 'ActionOutput_google_ads_removeadgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
