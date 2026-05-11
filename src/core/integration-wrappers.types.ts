import type {
	commentOnPr,
	squashMergePullRequest,
} from "../integrations/github";
import type {
	sendHumanReviewRequiredEmail,
	sendTaskOutcomeEmail,
} from "../integrations/notifications";

export interface IntegrationWrapperDeps {
	commentOnPr?: typeof commentOnPr;
	squashMergePullRequest?: typeof squashMergePullRequest;
	sendTaskOutcomeEmail?: typeof sendTaskOutcomeEmail;
	sendHumanReviewRequiredEmail?: typeof sendHumanReviewRequiredEmail;
}
