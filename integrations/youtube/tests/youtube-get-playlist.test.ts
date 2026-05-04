import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-playlist.js';

describe('youtube get-playlist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-playlist',
        Model: 'ActionOutput_youtube_getplaylist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
