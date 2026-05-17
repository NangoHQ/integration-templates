import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-collaboration.js';

describe('box get-collaboration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-collaboration',
        Model: 'ActionOutput_box_getcollaboration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
