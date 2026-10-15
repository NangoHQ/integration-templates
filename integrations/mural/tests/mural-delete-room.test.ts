import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-room.js';

describe('mural delete-room tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-room',
        Model: 'ActionOutput_mural_deleteroom'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
