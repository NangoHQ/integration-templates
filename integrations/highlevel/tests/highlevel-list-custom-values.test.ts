import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-custom-values.js';

describe('highlevel list-custom-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-custom-values',
        Model: 'ActionOutput_highlevel_listcustomvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
