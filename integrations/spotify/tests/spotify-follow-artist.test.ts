import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/follow-artist.js';

describe('spotify follow-artist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'follow-artist',
        Model: 'ActionOutput_spotify_followartist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
