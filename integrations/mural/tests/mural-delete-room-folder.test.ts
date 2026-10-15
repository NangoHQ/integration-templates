import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-room-folder.js';

describe('mural delete-room-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-room-folder',
        Model: 'ActionOutput_mural_deleteroomfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
