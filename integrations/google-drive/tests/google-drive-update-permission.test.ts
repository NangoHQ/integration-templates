import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-permission.js';

describe('google-drive update-permission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-permission',
        Model: 'ActionOutput_google_drive_updatepermission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
