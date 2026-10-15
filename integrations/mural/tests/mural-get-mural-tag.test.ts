import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-mural-tag.js';

describe('mural get-mural-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-mural-tag',
        Model: 'ActionOutput_mural_getmuraltag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
