import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-project.js';

describe('linear unarchive-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unarchive-project',
        Model: 'ActionOutput_linear_unarchiveproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
