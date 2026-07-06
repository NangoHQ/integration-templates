import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-scenario.js';

describe('make update-scenario tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-scenario',
        Model: 'ActionOutput_make_updatescenario'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
