import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-targeting-templates.js';

describe('pinterest list-targeting-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-targeting-templates',
        Model: 'ActionOutput_pinterest_listtargetingtemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
