import { expect, it, describe } from 'vitest';

import createAction from '../actions/remove-conversion-action.js';

describe('google-ads remove-conversion-action tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-conversion-action',
        Model: 'ActionOutput_google_ads_removeconversionaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
