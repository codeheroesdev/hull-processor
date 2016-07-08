import _ from "lodash";
import { EventEmitter } from "events";
import superagent from "superagent";

const EVENT = "CHANGE";

export default class Engine extends EventEmitter {

  constructor(config, { ship, currentUser }) {
    super();
    this.config = config;
    const userId = currentUser && currentUser.id;
    this.state = { ship, loading: false };
    this.compute({ ship, userId });
    this.compute = _.debounce(this.compute, 1000);
  }

  setState(changes) {
    this.state = { ...this.state, ...changes };
    this.emitChange();
    return this.state;
  }

  getState() {
    return this.state || {};
  }

  addChangeListener(listener) {
    this.addListener(EVENT, listener);
  }

  removeChangeListener(listener) {
    this.removeListener(EVENT, listener);
  }

  emitChange() {
    this.emit(EVENT);
  }

  searchUser(userSearch) {
    this.compute({ userSearch, ship: this.state.ship });
  }

  updateShip(ship) {
    this.compute({ ship, user: this.state.user });
  }

  compute(params) {
    if (this.state.loading) return false;
    this.setState({ loading: true });

    if (this.computing) {
      this.computing.abort();
    }
    this.computing = superagent.post("/compute")
      .query(this.config)
      .send(params)
      .accept("json")
      .end((error, { body = {}, status } = {}) => {
        try {
          this.computing = false;
          if (error) {
            this.setState({
              error: { ...body, status },
              loading: false,
              initialized: true
            });
          } else {
            const { ship, user, took, result } = body || {};
            this.setState({
              loading: false,
              initialized: true,
              error: null,
              ship, user, result, took
            });
          }
        } catch (err) {
          this.computing = false;
          this.setState({ loading: false, error: err });
        }
      });
    return this.computing;
  }

}
