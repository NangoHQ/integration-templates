import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-customers.js';

describe('gorgias merge-customers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-customers',
        Model: 'ActionOutput_gorgias_mergecustomers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
