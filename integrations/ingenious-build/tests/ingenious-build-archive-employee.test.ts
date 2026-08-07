import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-employee.js';

describe('ingenious-build archive-employee tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'archive-employee',
        Model: 'ActionOutput_ingenious_build_archiveemployee'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
