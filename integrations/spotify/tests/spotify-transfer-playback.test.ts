import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/transfer-playback.js';

describe('spotify transfer-playback tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'transfer-playback',
        Model: 'ActionOutput_spotify_transferplayback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
