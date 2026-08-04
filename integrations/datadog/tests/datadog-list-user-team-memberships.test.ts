import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-team-memberships.js';

describe('datadog list-user-team-memberships tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-team-memberships',
        Model: 'ActionOutput_datadog_listuserteammemberships'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
