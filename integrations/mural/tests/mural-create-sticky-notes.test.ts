import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sticky-notes.js';

describe('mural create-sticky-notes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sticky-notes',
        Model: 'ActionOutput_mural_createstickynotes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
