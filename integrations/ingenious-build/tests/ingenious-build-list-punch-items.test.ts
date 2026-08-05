import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-punch-items.js';

describe('ingenious-build list-punch-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-punch-items',
        Model: 'ActionOutput_ingenious_build_listpunchitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
