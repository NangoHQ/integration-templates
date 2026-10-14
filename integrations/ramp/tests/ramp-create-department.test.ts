import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-department.js';

describe('ramp create-department tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-department',
        Model: 'ActionOutput_ramp_createdepartment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
