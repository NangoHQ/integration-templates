import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-data-structure.js';

describe('make create-data-structure tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-data-structure',
        Model: 'ActionOutput_make_createdatastructure'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
