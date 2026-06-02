import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-object.js';

describe('algolia delete-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-object',
        Model: 'ActionOutput_algolia_deleteobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
