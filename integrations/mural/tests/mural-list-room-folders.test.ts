import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-room-folders.js';

describe('mural list-room-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-room-folders',
        Model: 'ActionOutput_mural_listroomfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
