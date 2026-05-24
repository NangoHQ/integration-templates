import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-saved-shows.js';

describe('spotify list-saved-shows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-saved-shows',
        Model: 'ActionOutput_spotify_listsavedshows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
