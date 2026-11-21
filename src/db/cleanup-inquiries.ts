import "dotenv/config";
import { cleanupExpiredInquiries } from "../features/inquiries/repository";
import { cleanupExpiredInquiryReportSnapshots } from "../features/inquiries/snapshots";

const apply = process.argv.includes("--apply");
const result = await cleanupExpiredInquiries(apply);
const snapshots = await cleanupExpiredInquiryReportSnapshots(apply);
console.log(JSON.stringify({ expired: result.count, snapshotsExpired: snapshots.count, applied: result.applied }));
