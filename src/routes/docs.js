const router = require("express").Router();
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapi");

router.get("/api-docs.json", (_req, res) => {
  res.json(openapiSpec);
});

router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

module.exports = router;
