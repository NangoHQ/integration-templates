import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-shared-drives.js';

describe('google-drive list-shared-drives tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-shared-drives',
        Model: 'ActionOutput_google_drive_listshareddrives'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
