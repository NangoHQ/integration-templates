import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-employee.js';

describe('ingenious-build unarchive-employee tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unarchive-employee',
        Model: 'ActionOutput_ingenious_build_unarchiveemployee'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
