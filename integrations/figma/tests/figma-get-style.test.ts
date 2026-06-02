import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-style.js';

describe('figma get-style tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-style',
        Model: 'ActionOutput_figma_getstyle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
