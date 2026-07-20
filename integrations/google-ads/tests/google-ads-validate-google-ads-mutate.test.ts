import { expect, it, describe } from 'vitest';

import createAction from '../actions/validate-google-ads-mutate.js';

describe('google-ads validate-google-ads-mutate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'validate-google-ads-mutate',
        Model: 'ActionOutput_google_ads_validategoogleadsmutate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
