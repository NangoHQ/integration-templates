import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-shapes.js';

describe('mural create-shapes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-shapes',
        Model: 'ActionOutput_mural_createshapes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
