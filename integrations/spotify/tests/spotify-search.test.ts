import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search.js';

describe('spotify search tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search',
        Model: 'ActionOutput_spotify_search'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
