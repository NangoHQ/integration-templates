import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-drive-item-version.js';

describe('sharepoint-online restore-drive-item-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-drive-item-version',
        Model: 'ActionOutput_sharepoint_online_restoredriveitemversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
