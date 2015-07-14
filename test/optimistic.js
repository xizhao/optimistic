var expect = require('expect.js'),
    Optimistic = require('../index.js');

describe('Optimistic', function() {
  describe('synchronous actions', function() { 
    var map;
    beforeEach(function() {
      map = new Optimistic({ a: 1, b: 2, c: 3 });
    });

    it('should construct properly', function() {
      expect(map._base.get('a')).to.be(1);
      expect(map._resolved.get('a')).to.be(1);
      expect(map._updateQueue.length).to.be(0);
      expect(map.value.a).to.be(1);
      expect(map.value.b).to.be(2);
      expect(map.value.c).to.be(3);
    });

    it('should apply immediate updates', function () {
      var map = new Optimistic({ a: 1, b: 2, c: 3 });
      map.update(function(obj) {
        obj.set('a', 'hello');
      });
      expect(map.value.a).to.be('hello');
      expect(map.value.b).to.be(2);
    });
  });

  describe('async actions', function() {
    var map, promise_a, promise_b, promise_c;
    beforeEach(function() {
      map = new Optimistic({ test_a: 'hello1', test_b: 'hello2', test_c: 'hello3' });
      promise_a = map.pushUpdate(function(obj) {
        obj.set('test_a', 'goodbye1');
      });
      promise_b = map.pushUpdate(function(obj) {
        obj.set('test_b', 'goodbye2');
      });
      promise_c = map.pushUpdate(function(obj) {
        obj.set('test_c', 'goodbye3');
      });
      expect(map._updateQueue.length).to.be(3);
    });

    it('should apply updates optimistically', function(done) {
      var map = new Optimistic({ test: 'hello' })
      expect(map.value.test).to.be('hello');
      expect(map._base.get('test')).to.be('hello');
      var promise = map.pushUpdate(function(obj) {
        obj.set('test', 'goodbye');
      });
      expect(map._base.get('test')).to.be('hello');
      expect(map._resolved.get('test')).to.be('goodbye');
      expect(map.value.test).to.be('goodbye');
      expect(map._updateQueue.length).to.be(1);
      setTimeout(promise.resolve, 5);
      setTimeout(function() {
        // promises resolve asynchronously
        expect(map._updateQueue.length).to.be(0);
        expect(map.value.test).to.be('goodbye');
        done();
      }, 10);
    });

    it('should permanently apply successful updates', function(done) {
      expect(map._base.get('test_a')).to.be('hello1');
      expect(map._resolved.get('test_a')).to.be('goodbye1');
      setTimeout(promise_a.resolve, 5);
      setTimeout(function() {
        expect(map._base.get('test_a')).to.be('goodbye1');
        expect(map._resolved.get('test_a')).to.be('goodbye1');
        done();
      }, 10);
    });

    it('should roll back failed updates', function(done) {
      var map = new Optimistic({ test: 'hello' })
      expect(map.value.test).to.be('hello');
      expect(map._base.get('test')).to.be('hello');
      var promise = map.pushUpdate(function(obj) {
        obj.set('test', 'goodbye');
      });
      expect(map._base.get('test')).to.be('hello');
      expect(map._resolved.get('test')).to.be('goodbye');
      expect(map.value.test).to.be('goodbye');
      expect(map._updateQueue.length).to.be(1);
      setTimeout(promise.reject, 5);
      setTimeout(function() {
        // promises resolve asynchronously
        expect(map._updateQueue.length).to.be(0);
        expect(map.value.test).to.be('hello');
        done();
      }, 10);
    });

    it('should handle mixed updates', function(done) {
      setTimeout(function() {
        promise_a.resolve();
      }, 10);
      setTimeout(function() {
        promise_b.resolve();
      }, 20);
      setTimeout(function() {
        promise_c.reject();
      }, 25);
      setTimeout(function() {
        expect(map.value.test_a).to.be('goodbye1');
        expect(map.value.test_b).to.be('goodbye2');
        expect(map.value.test_c).to.be('hello3');
        done();
      }, 30);
    });
  });
});
