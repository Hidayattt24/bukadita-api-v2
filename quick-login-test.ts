// Quick test to see actual login response format
const BASE_URL = "http://localhost:8080";

async function testLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: "superadmin@bukadita.test",
      password: "superadmin123",
    }),
  });

  const data = await response.json();

  console.log("Status:", response.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}

testLogin();
