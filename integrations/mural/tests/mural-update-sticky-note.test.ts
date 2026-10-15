import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-sticky-note.js';

describe('mural update-sticky-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-sticky-note',
        Model: 'ActionOutput_mural_updatestickynote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
