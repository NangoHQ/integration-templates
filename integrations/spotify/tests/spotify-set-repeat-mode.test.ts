import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-repeat-mode.js';

describe('spotify set-repeat-mode tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-repeat-mode',
        Model: 'ActionOutput_spotify_setrepeatmode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
