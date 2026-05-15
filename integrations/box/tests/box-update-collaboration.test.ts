import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-collaboration.js';

describe('box update-collaboration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-collaboration',
        Model: 'ActionOutput_box_updatecollaboration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
