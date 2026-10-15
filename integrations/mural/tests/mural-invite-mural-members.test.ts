import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-mural-members.js';

describe('mural invite-mural-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invite-mural-members',
        Model: 'ActionOutput_mural_invitemuralmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
