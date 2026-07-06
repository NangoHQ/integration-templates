import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-scenario-execution.js';

describe('make get-scenario-execution tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-scenario-execution',
        Model: 'ActionOutput_make_getscenarioexecution'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
