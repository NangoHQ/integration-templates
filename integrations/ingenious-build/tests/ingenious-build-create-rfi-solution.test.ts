import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-rfi-solution.js';

describe('ingenious-build create-rfi-solution tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-rfi-solution',
        Model: 'ActionOutput_ingenious_build_createrfisolution'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
