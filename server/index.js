import Hull from "hull";
import { Cache } from "hull/lib/infra";

import server from "./server";

if (process.env.NEW_RELIC_LICENSE_KEY) {
  console.warn("Starting newrelic agent with key: ", process.env.NEW_RELIC_LICENSE_KEY);
  require("newrelic"); // eslint-disable-line global-require
}

if (process.env.LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

if (process.env.LOGSTASH_HOST && process.env.LOGSTASH_HOST) {
  const Logstash = require("winston-logstash").Logstash; // eslint-disable-line global-require
  Hull.logger.add(Logstash, {
    node_name: "processor",
    port: process.env.LOGSTASH_PORT,
    host: process.env.LOGSTASH_HOST
  });
}

// https://www.npmjs.com/package/express-winston

Hull.logger.debug("processor.boot");

const cache = new Cache({
  store: "memory",
  max: process.env.SHIP_CACHE_MAX || 100,
  ttl: process.env.SHIP_CACHE_TTL || 60
});

const options = {
  hostSecret: process.env.SECRET || "1234",
  devMode: process.env.NODE_ENV === "development",
  port: process.env.PORT || 8082,
  Hull,
  clientConfig: {
    firehoseUrl: process.env.OVERRIDE_FIREHOSE_URL
  },
  cache
};

const connector = new Hull.Connector(options);
const app = server(connector, options);
connector.startApp(app);

Hull.logger.debug("processor.started", { port: options.port });
