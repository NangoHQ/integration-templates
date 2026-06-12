import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-call-media.js';

describe('gong-oauth get-call-media tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-call-media',
        Model: 'ActionOutput_gong_oauth_getcallmedia'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
