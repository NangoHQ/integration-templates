import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/seek-to-position.js';

describe('spotify seek-to-position tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'seek-to-position',
        Model: 'ActionOutput_spotify_seektoposition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
