import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-attachment.js';

describe('basecamp upload-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-attachment',
        Model: 'ActionOutput_basecamp_uploadattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
