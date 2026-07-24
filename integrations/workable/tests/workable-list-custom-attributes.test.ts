import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-custom-attributes.js';

describe('workable list-custom-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-custom-attributes',
        Model: 'ActionOutput_workable_listcustomattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
