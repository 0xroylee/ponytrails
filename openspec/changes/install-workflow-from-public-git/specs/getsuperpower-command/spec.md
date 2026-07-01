# GetSuperpower Public Git Source Spec

## ADDED Requirements

### Requirement: Install Public Git Workflow Sources

The CLI SHALL accept a public git repository URL as a GetSuperpower workflow
source for `install` and `clone`.

#### Scenario: user installs a workflow from a public git repository

- **WHEN** a user runs
  `getsuperpower install https://github.com/acme/release-review.git`
- **THEN** the CLI fetches the public repository into a temporary checkout
- **AND** validates the checkout's `workflow.json`
- **AND** installs every declared skill dependency
- **AND** writes the installed workflow record under `.getsuperpower/workflows`

#### Scenario: user clones a workflow from a public git repository

- **WHEN** a user runs
  `getsuperpower clone https://github.com/acme/release-review.git`
- **THEN** the CLI performs the same workflow installation as
  `getsuperpower install https://github.com/acme/release-review.git`
- **AND** no separate local-copy operation is required

### Requirement: Public Git Sources Preserve Relative Local Skills

The CLI SHALL resolve relative local skill sources in a git-sourced workflow
against the fetched workflow directory for the duration of the install command.

#### Scenario: workflow declares a local entry skill

- **GIVEN** the fetched workflow declares
  `{ "source": "./skills/release-review" }`
- **WHEN** the user installs the workflow from a public git URL
- **THEN** the skill installer receives the path to
  `skills/release-review` inside the fetched checkout
- **AND** the temporary checkout remains available until all declared skills are
  installed

### Requirement: Validate And Deps Support Public Git Sources

The CLI SHALL allow validation and dependency inspection for public git workflow
sources.

#### Scenario: user validates a public git workflow

- **WHEN** a user runs
  `getsuperpower validate https://github.com/acme/release-review.git`
- **THEN** the CLI fetches the repository
- **AND** prints the existing `GetSuperpower valid: <name>@<version>` summary
  when the manifest is valid

#### Scenario: user inspects public git workflow dependencies

- **WHEN** a user runs
  `getsuperpower deps https://github.com/acme/release-review.git`
- **THEN** the CLI fetches the repository
- **AND** prints the workflow's declared skill dependencies

### Requirement: Installed Records Preserve Durable Git Source Metadata

The CLI SHALL record public git workflow sources without storing temporary
checkout paths as durable source paths.

#### Scenario: installed workflow came from public git

- **WHEN** a public git workflow install succeeds
- **THEN** the installed workflow record has source kind `git`
- **AND** the record stores the original public git URL
- **AND** the record does not require the temporary checkout directory to keep
  existing after install

### Requirement: Public Git Checkout Lifecycle Is Temporary

The CLI SHALL clean temporary git checkouts after public git source commands.

#### Scenario: public git install succeeds

- **WHEN** the install command completes successfully
- **THEN** the temporary checkout directory is removed

#### Scenario: public git install fails

- **WHEN** manifest validation or skill installation fails after checkout
- **THEN** the CLI still attempts to remove the temporary checkout directory
- **AND** the user sees the original failure message

### Requirement: Raw Sandbox Install Smoke Proves Public Git Installability

The delivery SHALL include a raw sandbox smoke verification for public git
workflow install behavior.

#### Scenario: install runs without existing agent environment state

- **GIVEN** an empty project directory under `work/`
- **AND** an empty workspace-local home directory passed with `--home`
- **AND** a minimal environment that does not inherit existing agent skill
  directories or GetSuperpower state
- **WHEN** the user runs
  `getsuperpower install https://github.com/acme/release-review.git`
- **THEN** the install succeeds
- **AND** `.getsuperpower/workflows/<workflow>.json` exists inside the sandbox
  project directory
- **AND** the installed agent skill files exist inside the sandbox home
  directory
- **AND** the smoke check does not require files from the user's real home
  directory

### Requirement: Unsupported Git Sources Fail Clearly

The CLI SHALL fail with a clear message when a git workflow source is
unsupported or cannot be fetched.

#### Scenario: user provides a private or unreachable repository

- **WHEN** git cannot fetch the repository
- **THEN** the CLI reports that the public git workflow source could not be
  fetched
- **AND** the message includes the failing source URL

#### Scenario: fetched repository is not a GetSuperpower workflow

- **WHEN** the fetched repository does not contain `workflow.json` at the
  supported workflow location
- **THEN** the CLI reports that no GetSuperpower workflow manifest was found
