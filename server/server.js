import express from "express";
import path from "path";
import devMode from "./dev-mode";
import ComputeHandler from "./compute-handler";
import responseTime from "response-time";
import updateUser from "./user-update";

const hostSecret = process.env.SECRET || "1234";

module.exports = function Server(options = {}) {
  const { port, Hull, devMode: dev } = options;
  const { BatchHandler, NotifHandler, Routes, Middlewares } = Hull;
  const { hullClient } = Middlewares;
  const { Readme, Manifest } = Routes;

  const app = express();

  if (dev) app.use(devMode());
  app.use(responseTime());
  app.use(express.static(path.resolve(__dirname, "..", "dist")));
  app.use(express.static(path.resolve(__dirname, "..", "assets")));

  app.set("views", path.resolve(__dirname, "..", "views"));

  app.get("/manifest.json", Manifest(__dirname));
  app.get("/", Readme);
  app.get("/readme", Readme);


  app.post("/compute", ComputeHandler({ hostSecret, hullClient, Hull }));
  app.post("/batch", BatchHandler({
    groupTraits: false,
    handler: (notifications = [], context) => {
      notifications.map(n => updateUser(n, context));
    }
  }));
  app.post("/notify", NotifHandler({
    groupTraits: false,
    onSubscribe: function onSubscribe() {
      console.warn("Hello new subscriber !");
    },
    handlers: {
      "user:update": updateUser
    }
  }));

  // Error Handler
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err) {
      const data = {
        status: err.status,
        segmentBody: req.segment,
        method: req.method,
        headers: req.headers,
        url: req.url,
        params: req.params
      };
      console.log("Error ----------------", err.message, err.status, data);
    }

    return res.status(err.status || 500).send({ message: err.message });
  });

  Hull.log("started", { port });

  app.listen(port);

  return app;
};
