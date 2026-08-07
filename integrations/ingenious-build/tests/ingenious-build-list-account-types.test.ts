import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-types.js';

describe('ingenious-build list-account-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-types',
        Model: 'ActionOutput_ingenious_build_listaccounttypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
