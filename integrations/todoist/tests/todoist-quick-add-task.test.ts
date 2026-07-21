import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/quick-add-task.js';

describe('todoist quick-add-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'quick-add-task',
        Model: 'ActionOutput_todoist_quickaddtask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
