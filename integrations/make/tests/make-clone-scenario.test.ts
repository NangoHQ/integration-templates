import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/clone-scenario.js';

describe('make clone-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'clone-scenario',
        Model: 'ActionOutput_make_clonescenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
