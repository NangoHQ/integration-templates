import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-album.js';

describe('spotify get-album tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-album',
        Model: 'ActionOutput_spotify_getalbum'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
