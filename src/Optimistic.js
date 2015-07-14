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
  this._base = Immutable.fromJS(data); // the base source of truth -- initial data + every successful update
  this._resolved = this._base;         // the current optimistic copy -- base + pending changes
  this._updateQueue = [];              // list of update
  this.value = data;                   // JS copy of this._resolved -- TODO: possibly cache and calculate on need via accessor rather than per update resolvie
};

inherits(Optimistic, EventEmitter);

/**
 * Manually resolve any pending updates in queue and update value
 * @returns {object} Value
 */
Optimistic.prototype.resolveUpdates = function() {
  var self = this;
  // rebuild resolved updates
  var old_resolved_copy = this._resolved;
  this._resolved = this._base.withMutations(function(object) {
    // NOTE: order of applying updates shouldn't matter as there should be no data dependency between async updates
    // if you have a data dependency, then you should be applying them synchronously using pushUpdate's returned promise callbacks!
    for(var i=self._updateQueue.length - 1; i>=0; i--) {
      var update = self._updateQueue[i];
      if(update.promise.isPending()) {
        update.apply(object);
        continue;
      } else if(update.promise.isFulfilled()) {
        update.apply(object);
        // if the update succeeds, apply it permanently to the base for next resolution
        self._base = self._base.withMutations(update.apply);
      }
      // remove any resolved update
      self._updateQueue.splice(i, 1);
    }
  });
  if(old_resolved_copy !== this._resolved) {
    this.value = this._resolved.toJS();
    self.emit('change', this.value);
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
      old_resolved_copy = this._resolved,
      callbacks = {},
      update_queue_item = {
        apply: update,
        promise: null
      };
  update_queue_item.promise = callbacks._promise = new Promise(function(resolve, reject) {
    callbacks.succeeded = resolve;
    callbacks.failed = reject;
  });
  this._resolved = this._resolved.withMutations(update); 
  if(!deferResolve) {
    update_queue_item.promise.then(function() {
      self._base = self._base.withMutations(update); // apply only to base as resolved is already applied
      // TODO: since indexOf() is O(n), add an option to omit interactions with updateQueue if no manual resolution is needed
      self._updateQueue.splice(self._updateQueue.indexOf(update_queue_item), 1);
    }, function(err) {
      self.resolveUpdates(); // since the promise is rejected, this should rollback the update
      throw err;
    });
    if(old_resolved_copy !== this._resolved) {
      this.value = this._resolved.toJS();
      self.emit('change', this.value);
    }
  }
  self._updateQueue.push(update_queue_item);
  return callbacks;
};

/**
 * Immediately apply an update
 * @param {function} update
 * @returns {object} Value of this {Optimistic}
 */
Optimistic.prototype.update = function(update) {
  this._base = this._base.withMutations(update);
  this._resolved = this._resolved.withMutations(update);
  return this.value = this._resolved.toJS();
};

/**
 * Returns currently resolved value as an {Immutable} object
 * @returns {Immutable} Current resolved value
 */
Optimistic.prototype.getResolved = function() {
  return this._resolved;
};

module.exports = Optimistic;

