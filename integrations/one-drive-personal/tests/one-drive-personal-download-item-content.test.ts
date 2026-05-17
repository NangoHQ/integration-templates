import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-item-content.js';

describe('one-drive-personal download-item-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-item-content',
        Model: 'ActionOutput_one_drive_personal_downloaditemcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
