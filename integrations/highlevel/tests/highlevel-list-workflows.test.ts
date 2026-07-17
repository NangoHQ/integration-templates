import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workflows.js';

describe('highlevel list-workflows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workflows',
        Model: 'ActionOutput_highlevel_listworkflows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
