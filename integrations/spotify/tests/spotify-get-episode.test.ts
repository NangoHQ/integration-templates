import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-episode.js';

describe('spotify get-episode tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-episode',
        Model: 'ActionOutput_spotify_getepisode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
