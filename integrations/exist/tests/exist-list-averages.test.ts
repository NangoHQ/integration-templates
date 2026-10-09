import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-averages.js';

describe('exist list-averages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-averages',
        Model: 'ActionOutput_exist_listaverages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
