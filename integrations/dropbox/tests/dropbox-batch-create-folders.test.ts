import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-create-folders.js';

describe('dropbox batch-create-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-create-folders',
        Model: 'ActionOutput_dropbox_batchcreatefolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
