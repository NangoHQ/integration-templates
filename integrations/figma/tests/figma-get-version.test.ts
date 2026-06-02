import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-version.js';

describe('figma get-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-version',
        Model: 'ActionOutput_figma_getversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
