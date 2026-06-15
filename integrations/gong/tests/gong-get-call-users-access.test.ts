import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-call-users-access.js';

describe('gong-oauth get-call-users-access tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-call-users-access',
        Model: 'ActionOutput_gong_oauth_getcallusersaccess'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
