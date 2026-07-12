import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-milestone.js';

describe('shortcut update-milestone tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-milestone',
        Model: 'ActionOutput_shortcut_updatemilestone'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
