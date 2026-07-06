import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-scenario.js';

describe('make start-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-scenario',
        Model: 'ActionOutput_make_startscenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
