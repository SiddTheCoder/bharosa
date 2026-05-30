import type { KycStatus } from "./user";

export type KycDecision = "verified" | "pending" | "rejected";

export type KycClaimed = {
  name?: string;
  dob?: string;
  id_number?: string;
};

export type KycExtracted = {
  doc_type?: string;
  name?: string;
  name_romanized?: string;
  dob?: string;
  dob_gregorian?: string;
  id_number?: string;
  issuer?: string;
};

export type KycStatusResponse = {
  kyc_status: KycStatus;
  latest: null | {
    submission_id: string;
    decision: KycDecision;
    confidence: number;
    reasons: string[];
    doc_type?: string;
    claimed?: KycClaimed;
    extracted?: KycExtracted;
    doc_uris?: string[];
    selfie_uri?: string | null;
    created_at: string;
  };
};
