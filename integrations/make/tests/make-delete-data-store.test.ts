import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-data-store.js';

describe('make delete-data-store tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-data-store',
        Model: 'ActionOutput_make_deletedatastore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
