import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contracted-invoice.js';

describe('ingenious-build create-contracted-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contracted-invoice',
        Model: 'ActionOutput_ingenious_build_createcontractedinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
