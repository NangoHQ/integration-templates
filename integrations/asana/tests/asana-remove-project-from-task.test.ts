import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-project-from-task.js';

describe('asana remove-project-from-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-project-from-task',
        Model: 'ActionOutput_asana_removeprojectfromtask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
