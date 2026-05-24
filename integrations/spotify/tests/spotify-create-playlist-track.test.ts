import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-playlist-track.js';

describe('spotify create-playlist-track tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-playlist-track',
        Model: 'ActionOutput_spotify_createplaylisttrack'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
