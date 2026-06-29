import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-team.js';

describe('aircall delete-team tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-team',
        Model: 'ActionOutput_aircall_basic_deleteteam'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
