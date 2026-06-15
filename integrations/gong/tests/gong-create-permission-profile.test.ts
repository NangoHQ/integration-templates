import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-permission-profile.js';

describe('gong-oauth create-permission-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-permission-profile',
        Model: 'ActionOutput_gong_oauth_createpermissionprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
