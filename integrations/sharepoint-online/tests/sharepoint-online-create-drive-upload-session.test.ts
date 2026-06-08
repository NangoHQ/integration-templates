import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-drive-upload-session.js';

describe('sharepoint-online create-drive-upload-session tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-drive-upload-session',
        Model: 'ActionOutput_sharepoint_online_createdriveuploadsession'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
