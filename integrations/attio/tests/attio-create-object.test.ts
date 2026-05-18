import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-object.js';

describe('attio create-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-object',
        Model: 'ActionOutput_attio_createobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
