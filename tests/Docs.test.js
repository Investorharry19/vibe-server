const request = require("supertest");
const app = require("../src/app");

describe("API documentation", () => {
  it("serves the OpenAPI specification as JSON", async () => {
    const response = await request(app).get("/api-docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths["/auth/google"].post).toBeDefined();
    expect(response.body.paths["/vibes/nearby"].get).toBeDefined();
    expect(response.body["x-socket-io"].clientToServer).toHaveLength(3);
  });

  it("serves the interactive Swagger UI", async () => {
    const response = await request(app).get("/api-docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
  });
});
