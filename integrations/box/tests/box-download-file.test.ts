import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-file.js';

describe('box download-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-file',
        Model: 'ActionOutput_box_downloadfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
