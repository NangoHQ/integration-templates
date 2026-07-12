import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-story-task.js';

describe('shortcut update-story-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-story-task',
        Model: 'ActionOutput_shortcut_updatestorytask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
