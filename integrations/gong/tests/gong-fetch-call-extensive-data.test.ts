import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-call-extensive-data.js';

describe('gong-oauth fetch-call-extensive-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-call-extensive-data',
        Model: 'ActionOutput_gong_oauth_fetchcallextensivedata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
