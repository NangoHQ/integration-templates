import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/complete-task.js';

describe('ticktick complete-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'complete-task',
        Model: 'ActionOutput_ticktick_completetask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
