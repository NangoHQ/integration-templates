import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-current-user-profile.js';

describe('pennylane get-current-user-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-current-user-profile',
        Model: 'ActionOutput_pennylane_getcurrentuserprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
