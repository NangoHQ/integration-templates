import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-folder-and-create-task.js';

describe('wrike find-or-create-folder-and-create-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-folder-and-create-task',
        Model: 'ActionOutput_wrike_findorcreatefolderandcreatetask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
