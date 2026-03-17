import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/change-user-role.js';

describe('hubspot change-user-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'change-user-role',
        Model: 'ActionOutput_hubspot_changeuserrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
