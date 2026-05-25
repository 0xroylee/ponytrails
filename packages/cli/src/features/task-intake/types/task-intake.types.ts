export interface TaskIntakeAnswer {
	question: string;
	answer: string;
}

export interface TaskIntakeTask {
	title: string;
	description: string;
}

export interface TaskIntakeQuestionOption {
	label: string;
	value: string;
	description?: string;
	recommended?: boolean;
}

export interface TaskIntakeQuestion {
	question: string;
	options?: TaskIntakeQuestionOption[];
}

export type TaskIntakeDecision =
	| { result: "CLEAR"; task: TaskIntakeTask }
	| { result: "NEEDS_INFO"; questions: TaskIntakeQuestion[] };

export interface TaskIntakeCreatedTask {
	id: string;
	taskKey: string;
	projectId: string | null;
	title: string;
	content: string;
	priority: number;
	status: string;
	dueDate: string | null;
	creatorId: string;
	linkedPr: string | null;
	linearIssueId: string | null;
	linearIdentifier: string | null;
	linearUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TaskIntakeTaskCreator {
	createTask(input: TaskIntakeTask): Promise<TaskIntakeCreatedTask>;
}

export interface RunTaskIntakeOptions {
	request: string;
	maxClarificationRounds?: number;
	initialAnswers?: TaskIntakeAnswer[];
	providedAnswers?: TaskIntakeAnswer[];
	allowInteractiveQuestions?: boolean;
	nonInteractive?: boolean;
	askQuestion(question: string): Promise<string>;
}

export type TaskIntakeResolveResult =
	| {
			status: "ready";
			task: TaskIntakeTask;
	  }
	| { status: "needs_info"; questions: TaskIntakeQuestion[] };

export type TaskIntakeRunResult =
	| {
			status: "created";
			task: TaskIntakeCreatedTask;
	  }
	| { status: "needs_info"; questions: TaskIntakeQuestion[] };
