import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-task-comments.js';

describe('wrike list-task-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-task-comments',
        Model: 'ActionOutput_wrike_listtaskcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
