import compute from "./compute";
import _ from "lodash";
import isGroup from "./is-group-trait";
// import _ from "lodash";

function flatten(obj, key, group) {
  return _.reduce(group, (m, v, k) => {
    const n = (key) ? `${key}/${k}` : k;
    if (isGroup(v)) {
      flatten(m, n, v);
    } else {
      m[n] = v;
    }
    return m;
  }, obj);
}

module.exports = function handle({ message = {} }, { ship, hull }) {
  const { user, segments } = message;

  try {
    const { changes, events, account, accountClaims } = compute({ ...message, user }, ship);
    const asUser = hull.asUser(user.id);

    hull.logger.debug("compute.user.debug", { id: user.id, email: user.email, changes });

    if (_.size(changes.user)) {
      const flat = {
        ...changes.user.traits,
        ...flatten({}, "", _.omit(changes.user, "traits")),
      };

      if (_.size(flat)) {
        hull.logger.info("compute.user.computed", { id: user.id, changes: flat });
        asUser.traits(flat);
      }
    }

    if (_.size(changes.account)) {
      const flat = {
        ...changes.account.traits,
        ...flatten({}, "", _.omit(changes.account, "traits")),
      };

      if (_.size(flat)) {
        hull.logger.info("compute.account.computed", { id: account.id, changes: flat });
        asUser.account(accountClaims).traits(flat);
      }
    } else if (accountClaims) {
      asUser.account(accountClaims);
    }

    if (events.length > 0) {
      events.map(({ eventName, properties, context }) => asUser.track(eventName, properties, { source: "processor", ...context }));
    }
  } catch (err) {
    hull.logger.error("compute.error", { err, user, segments });
  }
};
