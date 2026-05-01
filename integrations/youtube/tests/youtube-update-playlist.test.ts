import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-playlist.js';

describe('youtube update-playlist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-playlist',
        Model: 'ActionOutput_youtube_updateplaylist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
