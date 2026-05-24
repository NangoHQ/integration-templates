import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-to-queue.js';

describe('spotify add-to-queue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-to-queue',
        Model: 'ActionOutput_spotify_addtoqueue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
