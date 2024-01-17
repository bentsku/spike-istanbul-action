// const core = require('@actions/core')
// const github = require('@actions/github')
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

function handleError(err) {
  console.error(err);

  if (err && err.message) {
    core.setFailed(err.message);
  } else {
    core.setFailed(`Unhandled error: ${err}`);
  }
}

process.on("unhandledRejection", handleError);

function parsePullRequestNumber(commitMessage) {
  // todo: very brittle, better parsing
  if (!commitMessage.includes("#")) return ""
  return commitMessage.split('#').pop().split(')')[0];
}

async function run() {
  const token = core.getInput("token", { required: true });
  const octokit = getOctokit(token);

  const branch = context.ref.replace("refs/heads/", "");


  const merged = [];
  let result = "";

  const iterator = octokit.paginate.iterator(octokit.rest.repos.listCommits, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: branch,
    per_page: 50,
  });

  for await (const { data: commits } of iterator) {
    for (const commit of commits) {
      const {
        data: {check_suites: checkSuites},
      } = await octokit.rest.checks.listSuitesForRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: commit.sha,
      });
      const success = checkSuites.find(
          (c) => c.status === "completed" && c.conclusion === "success"
      );
      if (success) {
        result = commit.sha;
        break;
      } else {
        const prNumber = parsePullRequestNumber(commit.commit.message)
        // todo: return if not PR number
        // todo: build URL
        merged.push(prNumber)
      }
    }
  }

  // iterate through each response
  // for await (const { data: commits } of iterator) {
  //   for (const commit of commits) {
  //     console.log("Issue #%d: %s", commit.sha, commit.title);
  //   }
  // }
  //
  // const { data: commits } = await octokit.rest.repos.listCommits({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  //   sha: branch,
  // });
  // core.info(`Number of commits: ${commits.length}`);

  // const merged = [];
  // let result = "";
  // for (const { sha } of commits) {
  //   const {
  //     data: { check_suites: checkSuites },
  //   } = await octokit.rest.checks.listSuitesForRef({
  //     owner: context.repo.owner,
  //     repo: context.repo.repo,
  //     ref: sha,
  //   });
  //   const success = checkSuites.find(
  //     (c) => c.status === "completed" && c.conclusion === "success"
  //   );
  //   if (success) {
  //     result = success.head_sha;
  //     break;
  //   } else {
  //       merged.push(success.head_sha)
  //   }
  // }
  core.info(`Successful Commit: ${result}`);
  core.info(`Merged commits before: ${merged}`)

  core.setOutput("result", result);
  core.setOutput("commits", merged.join(","))
}

run().catch(handleError);
