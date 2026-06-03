import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-drive-item.js';

describe('sharepoint-online delete-drive-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-drive-item',
        Model: 'ActionOutput_sharepoint_online_deletedriveitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
