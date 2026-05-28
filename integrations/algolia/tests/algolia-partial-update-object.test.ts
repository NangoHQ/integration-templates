import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/partial-update-object.js';

describe('algolia partial-update-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'partial-update-object',
        Model: 'ActionOutput_algolia_partialupdateobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
