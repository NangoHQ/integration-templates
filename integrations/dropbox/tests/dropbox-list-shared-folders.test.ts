import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-shared-folders.js';

describe('dropbox list-shared-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-shared-folders',
        Model: 'ActionOutput_dropbox_listsharedfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
