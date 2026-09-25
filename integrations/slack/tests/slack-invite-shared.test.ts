import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-shared.js';

describe('slack invite-shared tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invite-shared',
        Model: 'ActionOutput_slack_inviteshared'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
