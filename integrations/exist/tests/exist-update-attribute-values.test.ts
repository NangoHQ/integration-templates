import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-attribute-values.js';

describe('exist update-attribute-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-attribute-values',
        Model: 'ActionOutput_exist_updateattributevalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
