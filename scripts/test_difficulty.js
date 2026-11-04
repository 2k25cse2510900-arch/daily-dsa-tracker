"use strict";

const slugs = [
  "minimize-maximum-pair-sum-in-array",
  "find-the-duplicate-number",
  "find-first-and-last-position-of-element-in-sorted-array",
  "merge-in-between-linked-lists",
  "minimum-moves-to-equal-array-elements",
  "minimum-moves-to-equal-array-elements-iii"
];

async function fetchDetails(slug) {
  const query = `query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      difficulty
      title
    }
  }`;
  const res = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { titleSlug: slug } })
  });
  const data = await res.json();
  return data.data?.question;
}

async function run() {
  for (const slug of slugs) {
    const q = await fetchDetails(slug);
    console.log(slug, "-> ID:", q?.questionFrontendId, "Difficulty:", q?.difficulty, "Title:", q?.title);
  }
}
run().catch(console.error);
