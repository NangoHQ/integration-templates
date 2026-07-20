import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-conversion-action.js';

describe('google-ads create-conversion-action tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-conversion-action',
        Model: 'ActionOutput_google_ads_createconversionaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
