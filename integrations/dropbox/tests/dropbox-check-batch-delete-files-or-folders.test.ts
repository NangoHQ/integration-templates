import { expect, it, describe } from 'vitest';

import createAction from '../actions/check-batch-delete-files-or-folders.js';

describe('dropbox check-batch-delete-files-or-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-batch-delete-files-or-folders',
        Model: 'ActionOutput_dropbox_checkbatchdeletefilesorfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
