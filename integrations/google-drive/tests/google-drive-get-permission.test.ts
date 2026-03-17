import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-permission.js';

describe('google-drive get-permission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-permission',
        Model: 'ActionOutput_google_drive_getpermission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
