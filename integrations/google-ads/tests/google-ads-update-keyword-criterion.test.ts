import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-keyword-criterion.js';

describe('google-ads update-keyword-criterion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-keyword-criterion',
        Model: 'ActionOutput_google_ads_updatekeywordcriterion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
