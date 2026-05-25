import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-playlist-track.js';

describe('spotify delete-playlist-track tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-playlist-track',
        Model: 'ActionOutput_spotify_deleteplaylisttrack'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
