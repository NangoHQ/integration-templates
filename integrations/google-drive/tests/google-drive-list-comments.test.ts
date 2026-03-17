import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-comments.js';

describe('google-drive list-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-comments',
        Model: 'ActionOutput_google_drive_listcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
