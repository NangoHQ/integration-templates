import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-goal.js';

describe('clickup create-goal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-goal',
        Model: 'ActionOutput_clickup_creategoal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
