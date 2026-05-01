import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-playlist-item.js';

describe('youtube update-playlist-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-playlist-item',
        Model: 'ActionOutput_youtube_updateplaylistitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
