import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-asset.js';

describe('canva get-asset tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-asset',
        Model: 'ActionOutput_canva_getasset'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
