import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-permissions.js';

describe('google-drive list-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-permissions',
        Model: 'ActionOutput_google_drive_listpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
