import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-channel-playlists.js';

describe('youtube list-channel-playlists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-channel-playlists',
        Model: 'ActionOutput_youtube_listchannelplaylists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
