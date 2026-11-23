import type {
	InquiryCloseReason,
	InquiryStatus,
	ScenarioSnapshot,
} from "./validation";

export type InquirySubmission = {
	email: string;
	message: string;
	name?: string;
	organization?: string;
	country?: string;
	sector?: string;
	scenarioSnapshot?: ScenarioSnapshot;
	geographyIds: string[];
	noticeVersion: string;
};

export type InquiryProvenance = {
	capturedAt: string;
	geographyVersionId: string | null;
	geographyVersionCode: string | null;
	datasets: Array<{
		id: string;
		code: string;
		version: string;
		sourceId: string;
	}>;
	geographyIds: string[];
};

export type InquiryRecord = InquirySubmission & {
	inquiryId: string;
	referenceCode: string;
	status: InquiryStatus;
	closeReason: InquiryCloseReason | null;
	provenance: InquiryProvenance;
	createdAt: Date;
	updatedAt: Date;
	retentionAt: Date;
	anonymizedAt: Date | null;
};
