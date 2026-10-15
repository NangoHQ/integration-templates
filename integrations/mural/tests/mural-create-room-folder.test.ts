import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-room-folder.js';

describe('mural create-room-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-room-folder',
        Model: 'ActionOutput_mural_createroomfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
