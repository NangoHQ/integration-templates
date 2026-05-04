import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-playlist.js';

describe('youtube create-playlist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-playlist',
        Model: 'ActionOutput_youtube_createplaylist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
