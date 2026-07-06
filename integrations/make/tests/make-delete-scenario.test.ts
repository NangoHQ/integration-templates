import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-scenario.js';

describe('make delete-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-scenario',
        Model: 'ActionOutput_make_deletescenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
