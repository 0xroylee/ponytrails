# GetSuperpower Onboard Command Spec

## ADDED Requirements

### Requirement: Root Onboard Command

The CLI SHALL expose `onboard` as a root GetSuperpower command.

#### Scenario: user lists root commands

- **WHEN** a user runs `getsuperpower --help`
- **THEN** the command list includes `onboard`
- **AND** `onboard` is not nested under a removed compatibility subcommand

### Requirement: Step-By-Step Onboarding Flow

The CLI SHALL run onboarding as an ordered, interactive setup checklist.

#### Scenario: user starts onboarding

- **WHEN** a user runs `getsuperpower onboard`
- **THEN** the CLI checks RTK setup first
- **AND** checks CodeGraph setup second
- **AND** prints the status of each step before moving to the next step

#### Scenario: user declines a setup step

- **WHEN** the CLI asks whether to run a setup step
- **AND** the user declines
- **THEN** the CLI marks the step as skipped
- **AND** continues to the next setup step

### Requirement: RTK Setup Check

The onboarding flow SHALL help the user decide whether RTK setup is needed.

#### Scenario: RTK is already available

- **GIVEN** `rtk --version` succeeds
- **WHEN** the user runs `getsuperpower onboard`
- **THEN** the CLI reports RTK as already ready
- **AND** does not ask the user to install RTK

#### Scenario: RTK is missing

- **GIVEN** `rtk --version` fails
- **WHEN** the user runs `getsuperpower onboard`
- **THEN** the CLI asks whether the user wants RTK setup for reduced token usage
- **AND** the CLI runs only the approved RTK setup action or prints the approved
  setup instruction

### Requirement: CodeGraph Setup Check

The onboarding flow SHALL help the user decide whether CodeGraph indexing is
needed for the current project.

#### Scenario: CodeGraph is already initialized

- **GIVEN** `.codegraph/` exists in the target project directory
- **WHEN** the user runs `getsuperpower onboard`
- **THEN** the CLI reports CodeGraph as already ready
- **AND** does not ask the user to index the codebase

#### Scenario: CodeGraph is not initialized

- **GIVEN** `.codegraph/` does not exist in the target project directory
- **WHEN** the user runs `getsuperpower onboard`
- **THEN** the CLI asks whether the user wants to index the codebase with
  CodeGraph

#### Scenario: user confirms CodeGraph indexing

- **GIVEN** `.codegraph/` does not exist in the target project directory
- **WHEN** the user confirms CodeGraph setup
- **THEN** the CLI runs `codegraph init -i` in the target project directory
- **AND** reports whether indexing completed successfully

### Requirement: Onboard Command Is Testable Without Real Setup Side Effects

The onboarding implementation SHALL route prompts and setup commands through
injectable seams.

#### Scenario: tests exercise onboarding

- **WHEN** tests run the onboard flow
- **THEN** they can provide prompt answers without a real terminal
- **AND** they can simulate `rtk --version`
- **AND** they can simulate `codegraph init -i`
- **AND** they do not invoke the real RTK or CodeGraph binaries
- **AND** they do not mutate the user's real home directory

### Requirement: Onboard Failures Identify The Failed Step

The CLI SHALL report setup failures with the failed step name and the underlying
command failure detail.

#### Scenario: CodeGraph indexing fails

- **WHEN** the confirmed `codegraph init -i` command exits unsuccessfully
- **THEN** the CLI reports that CodeGraph setup failed
- **AND** includes the command failure detail available from the runner
