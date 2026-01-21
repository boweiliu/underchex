Implementation plan

1. Add the good cli tool builder dependencies
2. Write a spec for the cli interface. it should be very similar to the `docker` interface, like `winow start "blah prompt here"`, `winow ps`, `winow send "folllow up prompt here"`, `winow attach <id>`.
3. Have the spec pass peer review
4. Implement the commands in the spec but have them be noops
5. Start setting up a test framework - install necessary deps, write a failing and a passing test, etc.
6. Write reasonable test flows
