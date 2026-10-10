import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-task-in-project.js';

describe('ticktick find-or-create-task-in-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-task-in-project',
        Model: 'ActionOutput_ticktick_findorcreatetaskinproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
