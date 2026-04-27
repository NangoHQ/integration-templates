import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-project.js';

describe('linear update-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-project',
        Model: 'ActionOutput_linear_updateproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
