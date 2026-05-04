import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/share-folder.js';

describe('dropbox share-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'share-folder',
        Model: 'ActionOutput_dropbox_sharefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
