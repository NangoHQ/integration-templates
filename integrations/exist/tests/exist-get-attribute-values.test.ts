import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-attribute-values.js';

describe('exist get-attribute-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-attribute-values',
        Model: 'ActionOutput_exist_getattributevalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
