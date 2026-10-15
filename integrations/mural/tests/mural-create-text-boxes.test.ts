import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-text-boxes.js';

describe('mural create-text-boxes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-text-boxes',
        Model: 'ActionOutput_mural_createtextboxes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
