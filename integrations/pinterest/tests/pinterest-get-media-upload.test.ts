import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-media-upload.js';

describe('pinterest get-media-upload tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-media-upload',
        Model: 'ActionOutput_pinterest_getmediaupload'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
