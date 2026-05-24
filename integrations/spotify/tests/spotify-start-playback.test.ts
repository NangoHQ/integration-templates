import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-playback.js';

describe('spotify start-playback tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-playback',
        Model: 'ActionOutput_spotify_startplayback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
