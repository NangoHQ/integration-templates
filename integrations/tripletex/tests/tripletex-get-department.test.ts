import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-department.js';

describe('tripletex get-department tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-department',
        Model: 'ActionOutput_tripletex_getdepartment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
