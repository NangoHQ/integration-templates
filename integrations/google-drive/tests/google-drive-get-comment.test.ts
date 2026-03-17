import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-comment.js';

describe('google-drive get-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-comment',
        Model: 'ActionOutput_google_drive_getcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
