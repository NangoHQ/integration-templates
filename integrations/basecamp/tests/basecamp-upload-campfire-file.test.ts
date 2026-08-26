import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-campfire-file.js';

describe('basecamp upload-campfire-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-campfire-file',
        Model: 'ActionOutput_basecamp_uploadcampfirefile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
