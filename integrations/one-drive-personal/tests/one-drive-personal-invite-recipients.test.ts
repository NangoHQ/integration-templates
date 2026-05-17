import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-recipients.js';

describe('one-drive-personal invite-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invite-recipients',
        Model: 'ActionOutput_one_drive_personal_inviterecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
