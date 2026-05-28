import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-object.js';

describe('algolia update-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-object',
        Model: 'ActionOutput_algolia_updateobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
