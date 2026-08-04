import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-user-role.js';

describe('connectsecure update-user-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-user-role',
        Model: 'ActionOutput_connectsecure_updateuserrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
