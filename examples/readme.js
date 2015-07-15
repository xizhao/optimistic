var Optimistic = require('../index.js');

var book = new Optimistic({ title: 'To Kill a Mockingbird', awards: 1 });

console.log(book.value); // { title: "To Kill a Mockingbird", awards: 1 }

book.update(function(book_map) {
  // Your update function receives an Immutable.fromJS() copy of the initial data
  // In this case, book_map is an instance of Immutable.Map
  return book_map.set('author', 'Harper Lee')
                 .set('awards', book_map.get('awards') + 1)
                 .set('followers', ['Kevin', 'Caleb']);
  // Note: these are immutable objects! If you aren't familiar, read the Immutable-JS docs!
});

console.log(book.value); // { title: "To Kill a Mockingbird", author: "Harper Lee", awards: 2, followers: ["Kevin", "Caleb"] }

var update_callbacks = book.pushUpdate(function(book_map) {
  // Add "Marcy", "Zach", and "Bill" to the middle
  book_map.get('followers').splice(1, 0, 'Marcy', 'Zach', 'Bill');
  return book_map;
});

// Look, the update is applied optimistically!
console.log(book.value); // { title: "To Kill a Mockingbird", ... followers: ["Kevin", "Marcy", "Zach", "Bill", "Caleb"] }

setTimeout(function fakeAPICall() {
  update_callbacks.failed(new Error("500: We don't like Marcy.")); // uh oh, there's an error from our 'server'.
  book.on('change', function(value, resolved_updates) {
    // Phew! Looks like the update is rolled back!
    console.log(value); // { title: "To Kill a Mockingbird", ... followers: ["Kevin", "Caleb"] }
    console.log(resolved_updates); // [ { succeeded: false, value: [Error: 500: We don't like Marcy.] } ]
  });
}, 400);
