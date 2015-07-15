var Immutable = require('immutable'),
    EventEmitter = require('eventemitter3'),
    inherits = require('inherits'),
    Promise = require('bluebird');

/**
 * Creates an instance of Optimistic
 *
 * @constructor
 * @this {Optimistic}
 * @param {object} data
 */
var Optimistic = function(data) {
  this._pessimistic = Immutable.fromJS(data); // the base source of truth -- initial data + every successful update
  this._optimistic = this._pessimistic;       // the current optimistic copy -- base + pending changes
  this._updateQueue = [];                     // list of update
  this.value = data;                          // JS copy of this._optimistic -- TODO: possibly cache and calculate on need via accessor rather than per update resolvie
};

inherits(Optimistic, EventEmitter);

/**
 * Manually resolve any pending updates in queue and update value
 * @returns {object} Value
 */
Optimistic.prototype.resolveUpdates = function() {
  if(this._updateQueue.length <= 0) return this.value;
  // rebuild resolved updates
  var old_optimistic_copy = this._optimistic,
      resolved_updates = [];
  this._optimistic = this._pessimistic;
  // NOTE: order of applying updates shouldn't matter as there should be no data dependency between async updates
  // if you have a data dependency, then you should be applying them synchronously using pushUpdate's returned promise callbacks!
  for(var i=this._updateQueue.length - 1; i>=0; i--) {
    var update = this._updateQueue[i];
    if(update.promise.isPending()) {
      this._optimistic = update.apply(this._optimistic);
      continue;
    } else if(update.promise.isFulfilled()) {
      this._optimistic = update.apply(this._optimistic, update.promise.value());
      this._pessimistic = update.apply(this._pessimistic, update.promise.value());
    }
    // remove any resolved update & push to resolved list
    this._updateQueue.splice(i, 1);
    resolved_updates.push({
      succeeded: update.promise.isFulfilled(),
      value: update.promise.isFulfilled() ? update.promise.value() : update.promise.reason()
    });
  }
  if(old_optimistic_copy !== this._optimistic) { // todo: handle case where data doesn't change but new errors are present
    this.value = this._optimistic.toJS();
    this.emit('change', this.value, resolved_updates);
  }
  return this.value;
};

/**
 * Push an async update
 * @param {function} update A function that takes in a transient {Immutable} and applies updates
 * @param {boolean} deferResolve Whether to defer updating the value after the promise is resolved -- useful for batching resolutions and calling .resolveUpdates() manually
 * @returns {object} Promise callbacks used .resolve() or .reject() the update
 */
Optimistic.prototype.pushUpdate = function(update, deferResolve) {
  if(typeof update !== "function") {
    throw new Error("Updates must be a function.");
  }
  var self = this,
      old_optimistic_copy = this._optimistic,
      callbacks = {},
      update_queue_item = {
        apply: update,
        promise: null
      };
  update_queue_item.promise = callbacks._promise = new Promise(function(resolve, reject) {
    callbacks.succeeded = resolve;
    callbacks.failed = reject;
  });
  this._optimistic = update(this._optimistic); 
  if(!deferResolve) {
    update_queue_item.promise.then(function(value) {
      if(!value) {
        self._pessimistic = update(self._pessimistic); // apply only to base as resolved is already applied
        // TODO: since indexOf() is O(n), add an option to omit interactions with updateQueue if no manual resolution is needed
        self._updateQueue.splice(self._updateQueue.indexOf(update_queue_item), 1);
      } else {
        // if a value is provided by the server, we have to rollback the old application rebuild the optimistic copy
        self.resolveUpdates();
      }
    }, function(err) {
      self.resolveUpdates(); // since the promise is rejected, this should rollback the update
    });
    if(old_optimistic_copy !== this._optimistic) {
      this.value = this._optimistic.toJS();
      this.emit('change', this.value, []); // emit value and resolved updates (none)
    }
  }
  this._updateQueue.push(update_queue_item);
  return callbacks;
};

/**
 * Immediately apply an update
 * @param {function} update
 * @returns {object} Value of this {Optimistic}
 */
Optimistic.prototype.update = function(update) {
  this._pessimistic = update(this._pessimistic);
  this._optimistic = update(this._optimistic);
  return this.value = this._optimistic.toJS();
};

/**
 * Returns currently resolved value as an {Immutable} object
 * @returns {Immutable} Current resolved value
 */
Optimistic.prototype.getResolved = function() {
  return this._optimistic;
};

module.exports = Optimistic;
