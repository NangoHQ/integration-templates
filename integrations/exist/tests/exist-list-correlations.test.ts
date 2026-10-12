import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-correlations.js';

describe('exist list-correlations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-correlations',
        Model: 'ActionOutput_exist_listcorrelations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
