import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-models.js';

describe('anthropic list-models tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-models',
        Model: 'ActionOutput_anthropic_listmodels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
