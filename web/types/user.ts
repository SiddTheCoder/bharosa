export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export type AuthUser = {
  uid: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  merchant_id: string;
  kyc_status: KycStatus;
};
