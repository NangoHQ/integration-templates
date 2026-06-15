import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-call-users-access.js';

describe('gong-oauth remove-call-users-access tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-call-users-access',
        Model: 'ActionOutput_gong_oauth_removecallusersaccess'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
