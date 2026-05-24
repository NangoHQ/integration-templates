import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-space.js';

describe('clickup create-space tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-space',
        Model: 'ActionOutput_clickup_createspace'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
