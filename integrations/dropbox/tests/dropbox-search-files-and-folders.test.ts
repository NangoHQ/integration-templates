import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-files-and-folders.js';

describe('dropbox search-files-and-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-files-and-folders',
        Model: 'ActionOutput_dropbox_searchfilesandfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
