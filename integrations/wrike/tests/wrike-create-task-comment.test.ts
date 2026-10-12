import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-task-comment.js';

describe('wrike create-task-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-task-comment',
        Model: 'ActionOutput_wrike_createtaskcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
