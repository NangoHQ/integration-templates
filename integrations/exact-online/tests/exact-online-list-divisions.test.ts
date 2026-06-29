import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-divisions.js';

describe('exact-online list-divisions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-divisions',
        Model: 'ActionOutput_exact_online_listdivisions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
