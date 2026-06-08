import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-drive-item-content.js';

describe('sharepoint-online download-drive-item-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-drive-item-content',
        Model: 'ActionOutput_sharepoint_online_downloaddriveitemcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
