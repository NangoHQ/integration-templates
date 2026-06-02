import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-file-node.js';

describe('figma get-file-node tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-file-node',
        Model: 'ActionOutput_figma_getfilenode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
