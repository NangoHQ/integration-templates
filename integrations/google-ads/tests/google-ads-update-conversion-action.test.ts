import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-conversion-action.js';

describe('google-ads update-conversion-action tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-conversion-action',
        Model: 'ActionOutput_google_ads_updateconversionaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
