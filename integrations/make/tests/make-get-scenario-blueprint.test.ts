import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-scenario-blueprint.js';

describe('make get-scenario-blueprint tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-scenario-blueprint',
        Model: 'ActionOutput_make_getscenarioblueprint'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
