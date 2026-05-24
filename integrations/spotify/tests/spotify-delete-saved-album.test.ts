import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-saved-album.js';

describe('spotify delete-saved-album tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-saved-album',
        Model: 'ActionOutput_spotify_deletesavedalbum'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
