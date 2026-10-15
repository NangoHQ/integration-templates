import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-room-members.js';

describe('mural invite-room-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invite-room-members',
        Model: 'ActionOutput_mural_inviteroommembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
