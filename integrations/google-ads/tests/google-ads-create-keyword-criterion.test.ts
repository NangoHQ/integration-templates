import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-keyword-criterion.js';

describe('google-ads create-keyword-criterion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-keyword-criterion',
        Model: 'ActionOutput_google_ads_createkeywordcriterion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
