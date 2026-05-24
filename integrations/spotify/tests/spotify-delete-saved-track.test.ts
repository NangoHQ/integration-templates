import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-saved-track.js';

describe('spotify delete-saved-track tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-saved-track',
        Model: 'ActionOutput_spotify_deletesavedtrack'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
