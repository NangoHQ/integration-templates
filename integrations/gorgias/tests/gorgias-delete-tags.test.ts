import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-tags.js';

describe('gorgias delete-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-tags',
        Model: 'ActionOutput_gorgias_deletetags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
