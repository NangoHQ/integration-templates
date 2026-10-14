import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/manage-user-invite.js';

describe('ramp manage-user-invite tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'manage-user-invite',
        Model: 'ActionOutput_ramp_manageuserinvite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
