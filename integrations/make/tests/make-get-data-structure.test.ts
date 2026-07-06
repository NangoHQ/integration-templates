import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-data-structure.js';

describe('make get-data-structure tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-data-structure',
        Model: 'ActionOutput_make_getdatastructure'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
