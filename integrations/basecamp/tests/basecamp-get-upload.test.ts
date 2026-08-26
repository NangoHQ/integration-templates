import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-upload.js';

describe('basecamp get-upload tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-upload',
        Model: 'ActionOutput_basecamp_getupload'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
