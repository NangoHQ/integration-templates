import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-note-activity.js';

describe('close update-note-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-note-activity',
        Model: 'ActionOutput_close_updatenoteactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
