import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-data-store-record.js';

describe('make update-data-store-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-data-store-record',
        Model: 'ActionOutput_make_updatedatastorerecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
