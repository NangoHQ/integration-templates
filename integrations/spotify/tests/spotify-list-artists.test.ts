import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-artists.js';

describe('spotify list-artists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-artists',
        Model: 'ActionOutput_spotify_listartists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
