import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-negative-keyword.js';

describe('google-ads create-negative-keyword tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-negative-keyword',
        Model: 'ActionOutput_google_ads_createnegativekeyword'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
