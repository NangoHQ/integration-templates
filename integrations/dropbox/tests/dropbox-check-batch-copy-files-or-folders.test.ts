import { expect, it, describe } from 'vitest';

import createAction from '../actions/check-batch-copy-files-or-folders.js';

describe('dropbox check-batch-copy-files-or-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-batch-copy-files-or-folders',
        Model: 'ActionOutput_dropbox_checkbatchcopyfilesorfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
