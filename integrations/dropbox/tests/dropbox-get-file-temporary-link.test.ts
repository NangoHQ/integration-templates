import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-file-temporary-link.js';

describe('dropbox get-file-temporary-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-file-temporary-link',
        Model: 'ActionOutput_dropbox_getfiletemporarylink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
