import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-building.js';

describe('ingenious-build create-building tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-building',
        Model: 'ActionOutput_ingenious_build_createbuilding'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
