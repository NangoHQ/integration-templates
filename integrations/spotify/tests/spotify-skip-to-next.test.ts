import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/skip-to-next.js';

describe('spotify skip-to-next tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'skip-to-next',
        Model: 'ActionOutput_spotify_skiptonext'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
