import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-call-transcripts.js';

describe('gong-oauth fetch-call-transcripts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-call-transcripts',
        Model: 'ActionOutput_gong_oauth_fetchcalltranscripts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
