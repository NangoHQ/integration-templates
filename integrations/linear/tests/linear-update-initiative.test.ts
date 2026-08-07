import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-initiative.js';

describe('linear update-initiative tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-initiative',
        Model: 'ActionOutput_linear_updateinitiative'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
