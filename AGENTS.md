# This doc was 100% human-written.

Designed for a ralph LLM with numbered agents.

## Worfklow
You have 5 responsibilites:
1. Project management - what are the shippable milestones
2. Research - what are the open design questions or decisions
3. Spec writing - How should things work, what are testable outcomes
4. Implementation planning and code architecture - how should code, classes, deps be laid out
5. Writing, editing, and running and testing code

For project success, it is **CRUCIAL** that we spend much more effort on 1-3 than 4-5. You should work on only one level at a time.

Commit your changes early and often. Use conventional format: `[feat|fix|docs|refactor|test]: <msg> <signoff>`.  signoff -- include your agent number, your model, your harness, and a timestamp. Format: "Signed-by: agent #15.3.2 claude-sonnet-4 via amp".

1. Project management guidelines:
 * Check in on milestones and priorities if, judging by your agent number and document logs, no one else has recently.
 * Prioritize getting something usable first, but also don't hesitate to archive everything and restart from the research step once a suitable prototype has been reached.
 * Use agent numbers as well as real-time clock to track progress and make sure we don't get too far down in the weeds.

2. Research guidelines
 * Clearly state the open question you are trying to decide, and what criteria you would use to judge the options. Only then dive into options and their relative merits.
 * Carefully think through other options that you've failed to consider. A subagent might help for this.
 * When in doubt, just make default-good decisions that are simple and reversible. Document your reasoning and move on.
 * Clearly delineate subtasks that you are spawning just to prototype or investigate a certain option, vs. subtasks that are being created because we've landed (at least tenatively) on a given answer.

3. Spec writing
 * Start with the minimal happy path first and add features on gradually.
 * Allocate effort intelligently -- we'd rather have something basically working, than all the edge cases covered but the primary flow is not there yet. Prioritize ruthlessly.
 * Instead of wasting time thinking about trivial edge cases, focus your time on writing out complex flows that challenge what invariants we should have in our system. Basically - what parts of the spec would be easy to patch on later, and which parts of the spec would require more reworking if we got them wrong?
 * Don't dip into implementation level details. Focus on specs that dictate how the component should behave or what user flows should be supported.

4. Implementation planning
 * Use modular designs. Design your interfaces and your data models before your implementation.
 * Think about making the call-site as elegant as possible, rather than what is easiest on the implementation side.
 * Think about how to make individual components testable - frequently this means pure functions, transparent state that can be asserted against, explicit dependencies passed in.
 * "Unit tests" that just mock everything and trace through the code logic line-by-line are UNHELPFUL - we would rather REMOVE such "monkey see monkey do" tests rather than pollute the codebase with them. Instead, focus on an entirely separate logical path that is truly a second check for your logic -- use concrete examples in your tests.

5. Coding
 * Run tests prior to making any code changes, and then again after. Check code coverage numbers, or add that to the testing framework if it doesn't already exist, to make sure your code paths are being exercised.
 * Keep it simple and concise. Prefer explicit over implicit.
 * Use strong types in typed languages, and annotations/comments about expected types and contracts in untyped ones.
 * When running up against blocking compiler or test failures, do **NOT** just take the easy way out by adding test mocking or using `any` types. Instead, spawn a subagent to investigate and debug.
 * Write down your hypotheses, then use a debugger or a test case to validate them. If you haven't used a debugger this section yet, search the nb docs, and if no hits search the internet.
 * Commit early and often, including when the code doesn't quite work yet -- just make sure to include the current codebase state and any outstanding TODOS.
 * When you fix a bug, write a doc indicating the root cause, the investigation path, and the fix. See `nb` docs section below.

## Docs & nb

In this project we use the `nb` tool to record knowledge base docs and notes. nb is unrelated to jupyter/ipynb.

1. Before searching the codebase for context - **ALWAYS** use a `nb search #keyword` command to find if past agents have left useful docs or already solved this problem. Use one or two similar keywords if your first keyword doesn't find good results.
2. If you don't find anything in the nb search, but you do upon searching the codebase or grepping through the nb docs folder, you **MUST** create a new doc that's tagged with the keyword(s) you searched for originally. Also, if your first search gives documents that are unrelated or unreliable/outdated, you **MUST** go back to those docs and add a remark that those tags were unhelpful.
3. Whenever you think you have identified an issue with the code, the specs, or our assumptions, you **MUST** add a nb doc indicating what work you started off doing, AND what you did to identify and resolve the inconsistency. Furthermore, your new doc MUST cite and [[link]] back to the other docs you referenced.
4. Be **EXTREMELY** careful with trusting directly what you read, especially for older docs. There are a lot of docs being generated and not all of them are up to date -- do some searching to find newer information, and if you find any, you **MUST** add a LOUD warning to the deprecated doc and [[link]] to the updated info.
5. WHENEVER: you are done with a task (i.e. you have generated a code or doc artifact as a full goal completion or subgoal completion), you MUST create a "worklog" nb doc summarizing what you did and what are the next steps. For this doc in particular, do NOT use #tags since it is not necessary for it to be searchable. However you can and should link to other docs that you have created as well as other docs that you read earlier in your work stream.
6. **EXCEPTIONALLY IMPORTANT** - Do what we say not what we do!! If your instructions indicate to write docs a certain way, but the docs you come across work differently, you should follow instructions over preserving legacy patterns.
7. Run `nb sync --all` to commit your doc changes and save them to the cloud.

**MANDATORY** required reading is the "NB - Hub" doc on how to use `nb` in this repo. As an brief recap:

1. Almost all docs should be <50 lines long, and they should never exceed 200 lines of human-readable text -- the ONLY exception should be debugging docs that are mostly code snippets or logs. Many docs can simply be 1-2 lines of text, e.g. if their main goal is redirection.
2. Hub docs should contain only 1-3 lines of background information, but should contain many links to other topic docs, and also a brief explanation of WHY that other doc is relevant.
3. Hub docs can also link to other relevant hub docs.
4. Docs can use #tags and [[links]]. Linking to other docs is STRONGLY preferred over merely sharing tags.
5. When you link to a doc, you should edit that doc and create a backlink in a dedicated # Backlinks section at the bottom.
6. Whenever you create, edit, review, or comment on a doc, you **MUST** sign off -- include your agent number, your model, your harness, and a timestamp. Format: "[Signed|Edited|Reviewed|Commented]-by: agent #15.3.2 claude-sonnet-4 via amp 20260122T12:34:55", one signoff per line. If you only edited one section you should add the signoff at the end of that section.
7. nb docs can and should link to specific code snippets by filename, line number, and git commit.

## Subagents

You are encouraged to spawn subagents to help you with subtasks. In particular, for helping with Project Management, Research, or Spec Writing, it is **STRONGLY RECOMMENDED** to use reviewer agents to verify project plans, research resuults, or spec docs. When creating subagents:

1. Explicitly give them nb doc links or searchable tags so they can rapidly catch up on context. **HOWEVER** - it's also worth the time to do a more thorough knowledge base nb search, not only on #keyword-tags, but on related documents as well using grep, to make sure that the subagent gets only the most helpful documents for its current task.
2. Give them a hierarchical agent number, e.g. if you are agent 15, then use 15.1, 15.2, etc. for your subagents, and 15.2.1, 15.2.2, etc. for descendant subagents.
3. Give them verification criteria, i.e. what they should run to verify their task
4. Create a git worktree for them (see nb doc on Worktrees - Hub) and merge their worktree into your branch when they're done.
4. After they are finished, you should rerun their verification criteria to double-check that they haven't made a mistake. Trust but verify.

## Cleanup

Codebase and documentation repositories **ABSOLUTELY** need maintenance to be useful. Whenever you find outdated or confusing information, it is **YOUR RESPONSIBILITY** to clean it up.

Every 10th agent MUST treat it as their highest priority to first clean up their docs and code before starting on their prompt task. Otherwise the project will become an absolute chaotic mess. It's **CRUCIAL** that they invest a signficant amount of time into this -- it's **ABSOLUTELY NECESSSARY** for the continued operation of the project:

1. Identify nb doc #tags that are being overused. Not every doc needs to have a tag -- if the hub has a tag and the hub has a clear link to the doc, the leaf doc doesn't need a tag!! To verify -- running a search on any specific tag should return at most 10 docs.
2. Deduping similar and related tags -- do this with !!CARE!! so that searching on the old tag is possible. Recommended procedure is to create a brand new doc that's tagged with the old tag and simply mention that the new tag should be used instead.
3. Ensure consistency between the knowledge base docs in nb, and docs committed in the codebase or the code itself. 
4. Find code functions or files that are unused and delete them. Rename tokens for consistency and clarity. Do no-op refactors of large files or functions to break them up but keep the same code logic.
5. Clean up awkwardly written code. Fix up specs or docs that focus on the wrong thing.
5. **THE MOST IMPORTANT** - read the docs that give instructions on how to use nb itself, and update docs that don't follow those printed conventions. Remember - do what we say not what we do!!

Nice-to-haves but that have not yet (at this point) been built out.
* Priority ranking of tags -- hubs should always be read first when they come up in tag search results
* Ability of agents to leave signed comments of "this doc was useful to me" or "this doc linked to this other doc and that link was useful"

## AGENT TEST - MANDATORY

**CRITICAL INSTRUCTION** If this is your first time reading this document, before doing ANYTHING else you **MUST** first respond with: "I have read AGENTS.MD," and answer the following test questions. This is MANDATORY!!!

A) What are the 5 responsibilities of LLM agents in this project?
B) What were you prompted to work on?
C) What is your agent identity and sign-off signature? Are you a cleanup agent?
D) Which nb docs or nb search keywords will you read first, before starting on your task?


# PROJECT OVERVIEW
UNDERCHEX is a hexagonal chess variant project. The goals are:

* Find a suitable piece set, board shape, and ruleset on a hex-grid that's somewhat familiar to standard chess and/or chinese chess players and is, above all, fun to play. There's a lot of open questions around the specific rules and we'll need to experiment to figure out what works.
* Multiple planned implementations across languages (TypeScript, Python, Rust, etc.) to exercise our coding capabilites and also provide a bunch of working end-to-end applications that actually work and supoprt playing. Different languages have different tradeoffs so it'll be good to see how the different implementations play out.
* Some way to measure "how fun it is for humans". Part of this is an AI opponent with tree lookahead and alpha-beta pruning - we want to test against real humans after all. The code and artifacts we generate for the AI should also be useful for generating endgame puzzles, or guiding players through how they should learn to play this new chess variant (like point weightings for all the pieces).

