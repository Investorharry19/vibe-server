const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Vibe API",
    version: "1.0.0",
    description:
      "REST API for Vibe, a location-based social app. Protected endpoints use a JWT returned by Google sign-in. Socket.IO connects to this server with the token in handshake.auth.token. See the x-socket-io extension in the raw OpenAPI document for the event reference.",
  },
  servers: [{ url: "/", description: "Current server" }],
  "x-socket-io": {
    authentication: "Pass the Vibe JWT in handshake.auth.token.",
    clientToServer: [
      {
        event: "join_room",
        payload: { vibeId: "string" },
        description:
          "Join an active vibe room and receive up to the 50 most recent messages.",
      },
      {
        event: "leave_room",
        payload: { vibeId: "string" },
        description: "Leave a vibe room.",
      },
      {
        event: "send_message",
        payload: { vibeId: "string", message: "string (max 500 characters)" },
        description: "Send a message as a participant in an active vibe.",
      },
    ],
    serverToClient: [
      { event: "message_history", description: "Recent messages on room join." },
      { event: "receive_message", description: "A new room message." },
      { event: "request_received", description: "A join request was submitted." },
      { event: "request_approved", description: "A join request was approved." },
      { event: "request_rejected", description: "A join request was rejected." },
      { event: "vibe_created", description: "A new vibe was created." },
      { event: "vibe_expired", description: "A vibe expired or was deleted." },
      { event: "error", description: "A socket action failed." },
    ],
  },
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "Vibes" },
    { name: "Moderation" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check server health",
        responses: {
          200: {
            description: "Server is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/auth/google": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in with Google",
        description:
          "Verifies a Google ID token and returns a Vibe JWT. Send the returned JWT as a Bearer token to protected REST endpoints.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idToken"],
                properties: {
                  idToken: { type: "string", description: "Google ID token" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "user", "isNew"],
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                    isNew: { type: "boolean" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/vibes": {
      post: {
        tags: ["Vibes"],
        summary: "Create a vibe",
        description:
          "Creates a vibe hosted by the authenticated user. Coordinates use [longitude, latitude]. Duration must be 30–480 minutes.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateVibe" },
            },
          },
        },
        responses: {
          201: {
            description: "Vibe created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { vibe: { $ref: "#/components/schemas/Vibe" } },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/vibes/nearby": {
      get: {
        tags: ["Vibes"],
        summary: "Find nearby active vibes",
        description:
          "Results are sorted by distance and limited to 50. The default radius is 5 km; the maximum is 50 km.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -90, maximum: 90 },
          },
          {
            name: "lng",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -180, maximum: 180 },
          },
          {
            name: "radius",
            in: "query",
            description: "Search radius in kilometres (default 5)",
            schema: { type: "number", minimum: 0.1, maximum: 50 },
          },
          {
            name: "intent",
            in: "query",
            schema: { $ref: "#/components/schemas/Intent" },
          },
        ],
        responses: {
          200: {
            description: "Nearby vibes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    vibes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Vibe" },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/vibes/mine": {
      get: {
        tags: ["Vibes"],
        summary: "List active vibes hosted by the current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { $ref: "#/components/responses/VibeList" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/vibes/requested": {
      get: {
        tags: ["Vibes"],
        summary: "List active vibes the current user requested to join",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { $ref: "#/components/responses/VibeList" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/vibes/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
        },
      ],
      get: {
        tags: ["Vibes"],
        summary: "Get a vibe by ID",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Vibe details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { vibe: { $ref: "#/components/schemas/Vibe" } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Vibes"],
        summary: "Delete a vibe",
        description: "Only the vibe host can delete it.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { $ref: "#/components/responses/Message" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/vibes/{id}/request": {
      post: {
        tags: ["Vibes"],
        summary: "Request to join a vibe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        responses: {
          201: { $ref: "#/components/responses/Message" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
          410: { $ref: "#/components/responses/Gone" },
        },
      },
    },
    "/vibes/{id}/approve": {
      post: {
        tags: ["Vibes"],
        summary: "Approve a join request",
        description: "Only the vibe host can approve requests.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        requestBody: { $ref: "#/components/requestBodies/RespondToRequest" },
        responses: {
          200: { $ref: "#/components/responses/Message" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
          410: { $ref: "#/components/responses/Gone" },
        },
      },
    },
    "/vibes/{id}/reject": {
      post: {
        tags: ["Vibes"],
        summary: "Reject a join request",
        description: "Only the vibe host can reject requests.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        requestBody: { $ref: "#/components/requestBodies/RespondToRequest" },
        responses: {
          200: { $ref: "#/components/responses/Message" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          410: { $ref: "#/components/responses/Gone" },
        },
      },
    },
    "/report": {
      post: {
        tags: ["Moderation"],
        summary: "Report a user",
        description:
          "Accepts a report and logs it. Reports are not persisted by the current implementation.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetUserId", "reason"],
                properties: {
                  targetUserId: { type: "string" },
                  reason: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { $ref: "#/components/responses/Message" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/block": {
      post: {
        tags: ["Moderation"],
        summary: "Block a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetUserId"],
                properties: { targetUserId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { $ref: "#/components/responses/Message" },
          400: {
            description: "Invalid user ID or attempting to block yourself",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Intent: {
        type: "string",
        enum: ["drinks", "party", "chill", "hookup"],
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          googleId: { type: "string" },
          name: { type: "string" },
          photo: { type: "string", format: "uri", nullable: true },
          isVerified: { type: "boolean" },
          rating: { type: "number" },
          blockedUsers: { type: "array", items: { type: "string" } },
          isBanned: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateVibe: {
        type: "object",
        required: [
          "title",
          "intent",
          "coordinates",
          "maxPeople",
          "durationMinutes",
        ],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 80 },
          intent: { $ref: "#/components/schemas/Intent" },
          coordinates: {
            type: "array",
            description: "[longitude, latitude]",
            minItems: 2,
            maxItems: 2,
            items: { type: "number" },
            example: [-73.9857, 40.7484],
          },
          maxPeople: { type: "integer", minimum: 2, maximum: 50 },
          durationMinutes: { type: "integer", minimum: 30, maximum: 480 },
        },
      },
      Vibe: {
        type: "object",
        properties: {
          _id: { type: "string" },
          hostId: {
            oneOf: [
              { type: "string" },
              { $ref: "#/components/schemas/User" },
            ],
          },
          title: { type: "string" },
          intent: { $ref: "#/components/schemas/Intent" },
          location: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["Point"] },
              coordinates: {
                type: "array",
                description: "[longitude, latitude]",
                minItems: 2,
                maxItems: 2,
                items: { type: "number" },
              },
            },
          },
          maxPeople: { type: "integer" },
          participants: {
            type: "array",
            items: {
              oneOf: [
                { type: "string" },
                { $ref: "#/components/schemas/User" },
              ],
            },
          },
          requests: {
            type: "array",
            items: { $ref: "#/components/schemas/JoinRequest" },
          },
          expiresAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      JoinRequest: {
        type: "object",
        properties: {
          userId: {
            oneOf: [
              { type: "string" },
              { $ref: "#/components/schemas/User" },
            ],
          },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
          },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      ValidationErrors: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
      },
      Message: {
        type: "object",
        properties: { message: { type: "string" } },
      },
    },
    requestBodies: {
      RespondToRequest: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userId"],
              properties: { userId: { type: "string" } },
            },
          },
        },
      },
    },
    responses: {
      Message: {
        description: "Operation result",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Message" },
          },
        },
      },
      VibeList: {
        description: "Vibe list",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                vibes: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Vibe" },
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationErrors" },
          },
        },
      },
      Unauthorized: {
        description: "Missing, malformed, or invalid JWT",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Forbidden: {
        description: "The authenticated user is not allowed to perform this action",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Conflict: {
        description: "Request conflicts with the current resource state",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Gone: {
        description: "The vibe has expired",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
};

module.exports = openapiSpec;
