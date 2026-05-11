import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-folder.js';

describe('one-drive create-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-folder',
        Model: 'ActionOutput_one_drive_createfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
