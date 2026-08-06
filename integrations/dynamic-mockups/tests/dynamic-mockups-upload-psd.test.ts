import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-psd.js';

describe('dynamic-mockups upload-psd tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-psd',
        Model: 'ActionOutput_dynamic_mockups_uploadpsd'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
