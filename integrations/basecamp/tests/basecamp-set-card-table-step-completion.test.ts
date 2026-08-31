import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-card-table-step-completion.js';

describe('basecamp set-card-table-step-completion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-card-table-step-completion',
        Model: 'ActionOutput_basecamp_setcardtablestepcompletion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
