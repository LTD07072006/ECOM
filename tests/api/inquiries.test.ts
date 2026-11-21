import { expect, test } from "bun:test";
import { POST } from "../../src/app/api/inquiries/route";

const request = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost/api/inquiries", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("public inquiry API rejects malformed input without echoing personal fields", async () => {
  const response = await POST(request({ email: "not-an-email", message: "short" }));
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.fields).toEqual(["email", "message"]);
  expect(JSON.stringify(body)).not.toContain("not-an-email");
});

test("public inquiry API rejects non-JSON requests", async () => {
  const response = await POST(new Request("http://localhost/api/inquiries", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "email=a@example.com",
  }));
  expect(response.status).toBe(400);
});

test("public inquiry API does not expose private fields in malformed responses", async () => {
  const response = await POST(request({
    email: "private@example.com",
    message: "This private message must not be echoed.",
    unexpected: "secret-field",
  }));
  expect(response.status).toBe(400);
  const body = await response.text();
  expect(body).not.toContain("private@example.com");
  expect(body).not.toContain("This private message");
  expect(body).not.toContain("secret-field");
});
