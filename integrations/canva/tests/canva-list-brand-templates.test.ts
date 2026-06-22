import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-brand-templates.js';

describe('canva list-brand-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-brand-templates',
        Model: 'ActionOutput_canva_listbrandtemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
