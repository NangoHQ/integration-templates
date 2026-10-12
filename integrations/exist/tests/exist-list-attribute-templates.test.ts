import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-attribute-templates.js';

describe('exist list-attribute-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-attribute-templates',
        Model: 'ActionOutput_exist_listattributetemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
