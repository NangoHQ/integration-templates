import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-object.js';

describe('algolia get-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-object',
        Model: 'ActionOutput_algolia_getobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
