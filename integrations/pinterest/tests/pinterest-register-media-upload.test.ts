import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/register-media-upload.js';

describe('pinterest register-media-upload tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'register-media-upload',
        Model: 'ActionOutput_pinterest_registermediaupload'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
