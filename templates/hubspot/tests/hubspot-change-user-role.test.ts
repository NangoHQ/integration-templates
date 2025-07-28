import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/change-user-role.js';

describe('hubspot change-user-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'change-user-role',
        Model: 'ChangedRoleResponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
