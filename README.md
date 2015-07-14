# Optimistic
Immutable.js objects w/ Optimistic Updates for use in React/Flux or Vanilla javascript projects.

## Getting Started
Install via `git clone` or npm:
```
npm install optimistic --save
```

## Basic Usage

Create an Optimsitic object:
```javascript
var Optimistic = require('optimistic');

var book = new Optimistic({ title: 'To Kill a Mockingbird', awards: 1 });

console.log(book.value); // { title: "To Kill a Mockingbird", awards: 1 }
```

Update the object synchronously using operations from [Immutable JS](https://facebook.github.io/immutable-js/):
```javascript
book.update(function(book_map) {
  // Your update function receives an Immutable.toJS() copy of the initial data
  // In this case, book_map is an instance of Immutable.Map
  book_map.set('author', 'Harper Lee');
  book_map.set('awards', book_map.get('awards') + 1);
  book_map.set('followers', ['Kevin', 'Caleb']);
});

console.log(book.value); // { title: "To Kill a Mockingbird", author: "Harper Lee", awards: 2, followers: ["Kevin", "Caleb"] }
```

Now push an async update:
```javascript
var update_callbacks = book.pushUpdate(function(book_map) {
  // Remove "Kevin" from the front and add "Marcy", "Zach", and "Bill" to the end
  var followers = book_map.get('followers');
  followers.shift();
  followers.push('Marcy', 'Zach', 'Bill');
});

// Look, the update is applied optimistically!
console.log(book.value); // { title: "To Kill a Mockingbird", ... followers: ["Caleb", "Marcy", "Zach", "Bill"] }

setTimeout(function fakeAPICall() {
  update_callbacks.failed(new Error("500: We don't like Marcy.")); // uh oh, there's an error from our 'server'.
  book.on('change', function(value) {
    // Phew! Looks like the update is rolled back!
    console.log(value); // { title: "To Kill a Mockingbird", ... followers: ["Kevin", "Caleb"] }
  });
}, 400);
```

### A Few Notes:

Treat applying asynchronous updates as orderless.  There should be never be any dependencies between async updates that are submitted concurrently.

If you need to push ordered updates, do it when you call the `succeeded` and `failed` callbacks that `pushUpdate()` returns or use `pushUpdate()._promise`.

Update resolution is asynchronous, so after executing a callback, the update will be permanently applied or rolled back on the next tick.

`.on('change')` fires after an update is resolved but only if it changes the value of the object.

## Complex Updates
Optimistic is built so that you can do complex mutations as long as there are no dependencies between updates. 

## Usage with React/Flux
Optimistic was built so that optimistic UI updates with React and Flux would be really easy.

Optimistic objects are also event emitters, so use `.on('change')` to trigger change updates in your stores.

## Batching Update Resolutions
`.pushUpdate(function() { ... }, true)` -- passing in true as the second argument prevents updates from automatically resolving (applied permanently/rolled-back) after the callbacks execute.

If you have a large load of asynchronous events that you want to wait to return, you can gain a performance boost by preventing automatic resolution and then calling `.resolveUpdates()` to manually resolve all updates that have completed.

## Contributing
Open an issue or send a PR.

## License
[The MIT License](https://tldrlegal.com/license/mit-license#summary)

See `LICENSE` for details.

File an issue if you'd like an alternative license like the [Apache 2.0](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0))
