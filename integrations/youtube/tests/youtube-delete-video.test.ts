import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-video.js';

describe('youtube delete-video tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-video',
        Model: 'ActionOutput_youtube_deletevideo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
