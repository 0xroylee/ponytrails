# GetSuperpower CLI Styling Spec

## ADDED Requirements

### Requirement: Root Help Presents A Branded Welcome

The CLI SHALL present a branded GetSuperpower welcome in the root help output.

#### Scenario: user opens root help

- **WHEN** a user runs `getsuperpower --help`
- **THEN** the output includes an ASCII logo whose visible text reads
  `GETSUPERPOWER`
- **AND** the output includes a welcome message explaining that GetSuperpower
  installs and authors workflow skill trees
- **AND** the output includes short command examples for the primary author and
  install loops

### Requirement: CLI Styling Uses A Distinct GetSuperpower Palette

The CLI SHALL use a documented terminal color palette that is distinct from
Shopify branding.

#### Scenario: user reads the CLI style guide

- **WHEN** the user opens the CLI style guide
- **THEN** it documents colors for brand, success, warning, error, muted labels,
  and commands
- **AND** it states that Shopify CLI is a product-polish reference, not a brand
  source to copy

### Requirement: Command Output Reuses Shared Style Helpers

The CLI SHALL centralize terminal styling so command output stays consistent.

#### Scenario: command prints status output

- **WHEN** a command prints a success heading, label, warning, error, command,
  path, or next step
- **THEN** the command uses the shared CLI style helpers
- **AND** stripped-ANSI text remains stable for tests and logs

#### Scenario: user runs onboarding

- **WHEN** a user runs `getsuperpower onboard`
- **THEN** the onboarding header, workspace label, ready states, skipped states,
  setup guidance, and completion state use the shared CLI style helpers
- **AND** stripped-ANSI text still includes the same operational statuses

### Requirement: Styling Does Not Change Command Semantics

The CLI SHALL preserve the existing GetSuperpower command surface while
improving presentation.

#### Scenario: user inspects available commands

- **WHEN** a user runs `getsuperpower --help`
- **THEN** existing public root commands remain visible
- **AND** removed Pony Trail commands remain absent
- **AND** compatibility aliases remain labeled as compatibility aliases
