import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-show.js';

describe('spotify get-show tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-show',
        Model: 'ActionOutput_spotify_getshow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
