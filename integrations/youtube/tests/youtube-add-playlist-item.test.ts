import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-playlist-item.js';

describe('youtube add-playlist-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-playlist-item',
        Model: 'ActionOutput_youtube_addplaylistitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
