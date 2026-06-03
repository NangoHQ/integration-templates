import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-drive-item-permissions.js';

describe('sharepoint-online list-drive-item-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-drive-item-permissions',
        Model: 'ActionOutput_sharepoint_online_listdriveitempermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
