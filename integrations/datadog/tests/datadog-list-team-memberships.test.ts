import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-team-memberships.js';

describe('datadog list-team-memberships tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-team-memberships',
        Model: 'ActionOutput_datadog_listteammemberships'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
