import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-data-store-record.js';

describe('make create-data-store-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-data-store-record',
        Model: 'ActionOutput_make_createdatastorerecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
