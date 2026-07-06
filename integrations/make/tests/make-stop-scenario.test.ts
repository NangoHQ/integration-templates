import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/stop-scenario.js';

describe('make stop-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'stop-scenario',
        Model: 'ActionOutput_make_stopscenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
