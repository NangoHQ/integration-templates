import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-room-safely.js';

describe('mural delete-room-safely tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-room-safely',
        Model: 'ActionOutput_mural_deleteroomsafely'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
