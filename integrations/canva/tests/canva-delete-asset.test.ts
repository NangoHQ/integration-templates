import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-asset.js';

describe('canva delete-asset tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-asset',
        Model: 'ActionOutput_canva_deleteasset'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
