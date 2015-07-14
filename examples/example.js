var Optimistic = require('../index.js');

var book = new Optimistic({ title: 'To Kill a Mockingbird', awards: 1 });

console.log(book.value); // { title: "To Kill a Mockingbird", awards: 1 }

book.update(function(book_map) {
  // Your update function receives an Immutable.toJS() copy of the initial data
  // In this case, book_map is an instance of Immutable.Map
  book_map.set('author', 'Harper Lee');
  book_map.set('awards', book_map.get('awards') + 1);
  book_map.set('followers', ['Kevin', 'Caleb']);
});

console.log(book.value); // { title: "To Kill a Mockingbird", author: "Harper Lee", awards: 2, followers: ["Kevin", "Caleb"] }

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
