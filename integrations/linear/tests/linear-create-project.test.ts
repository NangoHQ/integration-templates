import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-project.js';

describe('linear create-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-project',
        Model: 'ActionOutput_linear_createproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
