import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-department.js';

describe('ramp-sandbox update-department tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-department',
        Model: 'ActionOutput_ramp_sandbox_updatedepartment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
