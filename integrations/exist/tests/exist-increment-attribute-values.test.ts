import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/increment-attribute-values.js';

describe('exist increment-attribute-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'increment-attribute-values',
        Model: 'ActionOutput_exist_incrementattributevalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
