import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-shared-drive.js';

describe('google-drive update-shared-drive tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-shared-drive',
        Model: 'ActionOutput_google_drive_updateshareddrive'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
