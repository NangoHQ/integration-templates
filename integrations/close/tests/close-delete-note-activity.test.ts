import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-note-activity.js';

describe('close delete-note-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-note-activity',
        Model: 'ActionOutput_close_deletenoteactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
