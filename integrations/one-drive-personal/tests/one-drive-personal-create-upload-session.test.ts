import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-upload-session.js';

describe('one-drive-personal create-upload-session tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-upload-session',
        Model: 'ActionOutput_one_drive_personal_createuploadsession'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
