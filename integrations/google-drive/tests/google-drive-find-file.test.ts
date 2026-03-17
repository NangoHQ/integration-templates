import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-file.js';

describe('google-drive find-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-file',
        Model: 'ActionOutput_google_drive_findfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
