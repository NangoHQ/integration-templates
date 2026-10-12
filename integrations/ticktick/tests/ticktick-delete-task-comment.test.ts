import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-task-comment.js';

describe('ticktick delete-task-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-task-comment',
        Model: 'ActionOutput_ticktick_deletetaskcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
