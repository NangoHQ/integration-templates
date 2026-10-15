import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-room-and-create-mural.js';

describe('mural find-or-create-room-and-create-mural tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-room-and-create-mural',
        Model: 'ActionOutput_mural_findorcreateroomandcreatemural'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
