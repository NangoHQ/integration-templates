import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-room.js';

describe('mural update-room tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-room',
        Model: 'ActionOutput_mural_updateroom'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
