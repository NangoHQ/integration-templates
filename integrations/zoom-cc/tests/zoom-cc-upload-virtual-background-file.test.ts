import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-virtual-background-file.js';

describe('zoom-cc upload-virtual-background-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-virtual-background-file',
        Model: 'ActionOutput_zoom_cc_uploadvirtualbackgroundfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
