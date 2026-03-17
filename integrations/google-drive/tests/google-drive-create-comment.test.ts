import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-comment.js';

describe('google-drive create-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-comment',
        Model: 'ActionOutput_google_drive_createcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
