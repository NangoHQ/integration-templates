import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-file-component-sets.js';

describe('figma get-file-component-sets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-file-component-sets',
        Model: 'ActionOutput_figma_getfilecomponentsets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
