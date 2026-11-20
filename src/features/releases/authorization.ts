import { createHash, timingSafeEqual } from "node:crypto";
import type { ReleaseRole } from "./operations";

export function releaseRole(request: Request): ReleaseRole | null {
  const reviewer = process.env.RELEASE_REVIEWER_TOKEN;
  const steward = process.env.RELEASE_STEWARD_TOKEN;
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43,128})$/)?.[1];
  const valid = /^[A-Za-z0-9_-]{43,128}$/;
  if (!reviewer || !steward || !valid.test(reviewer) || !valid.test(steward) || reviewer === steward || !token) return null;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const actual = digest(token);
  const isReviewer = timingSafeEqual(actual, digest(reviewer));
  const isSteward = timingSafeEqual(actual, digest(steward));
  return isReviewer ? "reviewer" : isSteward ? "steward" : null;
}
