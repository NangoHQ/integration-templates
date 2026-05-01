import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-uploaded-videos.js';

describe('youtube list-uploaded-videos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-uploaded-videos',
        Model: 'ActionOutput_youtube_listuploadedvideos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
