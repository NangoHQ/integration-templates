import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-scenario.js';

describe('make run-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-scenario',
        Model: 'ActionOutput_make_runscenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
