import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unassign-task.js';

describe('ticktick unassign-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unassign-task',
        Model: 'ActionOutput_ticktick_unassigntask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
