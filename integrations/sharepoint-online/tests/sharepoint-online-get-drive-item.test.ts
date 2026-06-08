import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-drive-item.js';

describe('sharepoint-online get-drive-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-drive-item',
        Model: 'ActionOutput_sharepoint_online_getdriveitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
