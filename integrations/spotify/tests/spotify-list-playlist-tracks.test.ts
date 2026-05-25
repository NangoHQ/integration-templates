import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-playlist-tracks.js';

describe('spotify list-playlist-tracks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-playlist-tracks',
        Model: 'ActionOutput_spotify_listplaylisttracks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
