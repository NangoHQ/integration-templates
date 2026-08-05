import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-user-invitations.js';

describe('datadog delete-user-invitations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-user-invitations',
        Model: 'ActionOutput_datadog_deleteuserinvitations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
