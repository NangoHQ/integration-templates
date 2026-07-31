import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-supplier.js';

describe('tripletex delete-supplier tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-supplier',
        Model: 'ActionOutput_tripletex_deletesupplier'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
