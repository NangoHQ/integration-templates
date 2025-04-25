"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// demo-github-integration/syncs/github-issue-example.ts
var github_issue_example_exports = {};
__export(github_issue_example_exports, {
  default: () => fetchData
});
module.exports = __toCommonJS(github_issue_example_exports);
var LIMIT = 100;
async function fetchData(nango) {
  const repos = await getAllRepositories(nango);
  for (const repo of repos) {
    const proxyConfig = {
      endpoint: `/repos/${repo.owner.login}/${repo.name}/issues`,
      paginate: {
        limit: LIMIT
      }
    };
    for await (const issueBatch of nango.paginate(proxyConfig)) {
      const issues = issueBatch.filter((issue) => !("pull_request" in issue));
      const mappedIssues = issues.map((issue) => ({
        id: issue.id,
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user.login,
        author_id: issue.user.id,
        body: issue.body,
        date_created: issue.created_at,
        date_last_modified: issue.updated_at
      }));
      if (mappedIssues.length > 0) {
        await nango.batchSave(mappedIssues, "GithubIssue");
        await nango.log(`Sent ${mappedIssues.length} issues from ${repo.owner.login}/${repo.name}`);
      }
    }
  }
}
async function getAllRepositories(nango) {
  const records = [];
  const proxyConfig = {
    endpoint: "/user/repos",
    paginate: {
      limit: LIMIT
    }
  };
  for await (const recordBatch of nango.paginate(proxyConfig)) {
    records.push(...recordBatch);
  }
  return records;
}
