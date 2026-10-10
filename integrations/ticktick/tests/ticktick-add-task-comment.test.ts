import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-task-comment.js';

describe('ticktick add-task-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-task-comment',
        Model: 'ActionOutput_ticktick_addtaskcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
