import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-attributes-with-values.js';

describe('exist list-attributes-with-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-attributes-with-values',
        Model: 'ActionOutput_exist_listattributeswithvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
