import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-video.js';

describe('youtube update-video tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-video',
        Model: 'ActionOutput_youtube_updatevideo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
