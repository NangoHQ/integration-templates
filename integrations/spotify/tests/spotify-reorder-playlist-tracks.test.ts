import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reorder-playlist-tracks.js';

describe('spotify reorder-playlist-tracks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reorder-playlist-tracks',
        Model: 'ActionOutput_spotify_reorderplaylisttracks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
