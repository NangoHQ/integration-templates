import { expect, it, describe } from 'vitest';

import createAction from '../actions/check-unshare-folder.js';

describe('dropbox check-unshare-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-unshare-folder',
        Model: 'ActionOutput_dropbox_checkunsharefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
