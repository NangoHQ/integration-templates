import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-creation-task-status.js';

describe('ramp-sandbox get-user-creation-task-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-creation-task-status',
        Model: 'ActionOutput_ramp_sandbox_getusercreationtaskstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
