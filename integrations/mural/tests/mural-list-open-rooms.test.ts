import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-open-rooms.js';

describe('mural list-open-rooms tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-open-rooms',
        Model: 'ActionOutput_mural_listopenrooms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
