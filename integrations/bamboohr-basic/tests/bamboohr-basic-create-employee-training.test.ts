import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-employee-training.js';

describe('bamboohr create-employee-training tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-employee-training',
        Model: 'ActionOutput_bamboohr_createemployeetraining'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
