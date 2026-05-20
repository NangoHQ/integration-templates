import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-queue.js';

describe('spotify get-queue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-queue',
        Model: 'ActionOutput_spotify_getqueue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
