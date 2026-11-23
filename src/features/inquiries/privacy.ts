export const INQUIRY_NOTICE_VERSION = "inquiry-privacy-v2";

export function inquiryPrivacyContact() {
	const controller = process.env.INQUIRY_PRIVACY_CONTROLLER?.trim();
	const email = process.env.INQUIRY_PRIVACY_EMAIL?.trim();
	if (
		!controller ||
		controller.length > 200 ||
		!email ||
		email.length > 254 ||
		!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)
	)
		return null;
	return { controller, email };
}
