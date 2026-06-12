import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-call.js';

describe('gong-oauth upload-call tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-call',
        Model: 'ActionOutput_gong_oauth_uploadcall'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
