import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-comment.js';

describe('google-drive delete-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-comment',
        Model: 'ActionOutput_google_drive_deletecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
