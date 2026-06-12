import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-permission-profile.js';

describe('gong-oauth get-permission-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-permission-profile',
        Model: 'ActionOutput_gong_oauth_getpermissionprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
