import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-permission-profile.js';

describe('gong-oauth update-permission-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-permission-profile',
        Model: 'ActionOutput_gong_oauth_updatepermissionprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
