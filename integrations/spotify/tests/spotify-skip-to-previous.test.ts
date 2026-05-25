import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/skip-to-previous.js';

describe('spotify skip-to-previous tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'skip-to-previous',
        Model: 'ActionOutput_spotify_skiptoprevious'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
