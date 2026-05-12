import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-drive.js';

describe('one-drive get-drive tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-drive',
        Model: 'ActionOutput_one_drive_getdrive'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
