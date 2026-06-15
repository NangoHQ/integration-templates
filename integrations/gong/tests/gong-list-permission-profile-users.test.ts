import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-permission-profile-users.js';

describe('gong-oauth list-permission-profile-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-permission-profile-users',
        Model: 'ActionOutput_gong_oauth_listpermissionprofileusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
