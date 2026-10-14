import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-user-invite.js';

describe('ramp create-user-invite tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-user-invite',
        Model: 'ActionOutput_ramp_createuserinvite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
