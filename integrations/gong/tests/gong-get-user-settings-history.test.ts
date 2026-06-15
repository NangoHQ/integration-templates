import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-settings-history.js';

describe('gong-oauth get-user-settings-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-settings-history',
        Model: 'ActionOutput_gong_oauth_getusersettingshistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
