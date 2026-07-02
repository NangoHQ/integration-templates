import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-data-stores.js';

describe('make list-data-stores tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-data-stores',
        Model: 'ActionOutput_make_listdatastores'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
