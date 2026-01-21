Implementation plan

1. Add the good cli tool builder dependencies
2. Write a spec for the cli interface. it should be very similar to the `docker` interface, like `winow start "blah prompt here"`, `winow ps` (alias for winow list), `winow send "folllow up prompt here"`, `winow attach <id>`.
3. Have the spec pass peer review
4. Implement the commands in the spec but have them be noops
5. Start setting up a test framework - install necessary deps, write a failing and a passing test, etc.
6. Draft some reasonable test flows/user stories in human language for human review
7. Write 1-3 tests that cover the basic flows first, and defer the other tests for later (leave them named but no body)
8. Think about implementation module units (tmux, subprocess) and submit for review
9. Implement until tests pass
