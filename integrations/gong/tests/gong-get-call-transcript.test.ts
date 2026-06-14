import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-call-transcript.js';

describe('gong-oauth get-call-transcript tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-call-transcript',
        Model: 'ActionOutput_gong_oauth_getcalltranscript'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
