import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-data-store-records.js';

describe('make delete-data-store-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-data-store-records',
        Model: 'ActionOutput_make_deletedatastorerecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
