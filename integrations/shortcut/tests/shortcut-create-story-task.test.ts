import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-story-task.js';

describe('shortcut create-story-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-story-task',
        Model: 'ActionOutput_shortcut_createstorytask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
