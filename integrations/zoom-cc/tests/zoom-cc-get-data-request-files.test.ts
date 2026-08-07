import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-data-request-files.js';

describe('zoom-cc get-data-request-files tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-data-request-files',
        Model: 'ActionOutput_zoom_cc_getdatarequestfiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
