import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-milestone.js';

describe('shortcut create-milestone tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-milestone',
        Model: 'ActionOutput_shortcut_createmilestone'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
