import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-mural.js';

describe('mural update-mural tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-mural',
        Model: 'ActionOutput_mural_updatemural'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
