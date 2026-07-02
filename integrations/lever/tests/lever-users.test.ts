import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/users.js';

describe('lever-basic users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'users',
        Model: 'ActionOutput_lever_basic_users'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
