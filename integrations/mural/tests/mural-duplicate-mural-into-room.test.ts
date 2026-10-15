import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-mural-into-room.js';

describe('mural duplicate-mural-into-room tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-mural-into-room',
        Model: 'ActionOutput_mural_duplicatemuralintoroom'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
