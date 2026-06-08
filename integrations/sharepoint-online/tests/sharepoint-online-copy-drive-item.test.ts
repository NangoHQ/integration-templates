import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-drive-item.js';

describe('sharepoint-online copy-drive-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-drive-item',
        Model: 'ActionOutput_sharepoint_online_copydriveitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
