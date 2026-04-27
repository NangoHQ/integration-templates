import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-viewer.js';

describe('linear get-viewer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-viewer',
        Model: 'ActionOutput_linear_getviewer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
