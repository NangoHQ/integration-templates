import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-small-file.js';

describe('one-drive-personal upload-small-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-small-file',
        Model: 'ActionOutput_one_drive_personal_uploadsmallfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
