import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-mural-full-content.js';

describe('mural get-mural-full-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-mural-full-content',
        Model: 'ActionOutput_mural_getmuralfullcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
