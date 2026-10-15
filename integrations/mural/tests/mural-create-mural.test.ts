import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-mural.js';

describe('mural create-mural tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-mural',
        Model: 'ActionOutput_mural_createmural'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
