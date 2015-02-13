// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;
var lastCard = '';
var userCards = {};

// Update userCards, lastCard
function initCards() {
}

// Update userCards, lastCard
// return if false, the user wins and the game is finished.
function updateCards(username, card) {
  var cards = userCards[username];
  var indexOfCards = cards.indexOf(card);
  if (indexOfCards == -1) return true;

  var lastCardNumber = lastCard.slice(0, lastCard.length - 1);
  var lastCardType = lastCard.slice(lastCard.length - 1, lastCard.length);
  var cardNumber = card.slice(0, card.length - 1);
  var cardType = card.slice(card.length - 1, card.length);
  if (cardNumber != lastCardNumber && cardType != lastCardType) return true;

  // update last card
  lastCard = card;

  // remove the card from the user's cards
  cards = cards.slice(0, indexOfCards).concat(cards.slice(indexOfCards + 1));
  userCards[username] = cards;

  if (cards.length == 0) return false;
  return true;
}

// Return response string
function toStringCards(username) {
}

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
