import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-drive-item-permission.js';

describe('sharepoint-online remove-drive-item-permission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-drive-item-permission',
        Model: 'ActionOutput_sharepoint_online_removedriveitempermission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
