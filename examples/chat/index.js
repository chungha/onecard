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
var sockets = {};
var numUsers = 0;
var lastCard = '';
var userCards = {};
var started = false;

// Update userCards, lastCard
function initCards() {
  var LETTER = ["a", "b", "c", "d"];
  var totalCards = [];
  for (i = 0; i < 4; i++) {
    for (j = 1; j <= 10; j++) {
      totalCards.push(j.toString() + LETTER[i]);
    }
  }
  var lastCardIndex = Math.floor((Math.random() * totalCards.length));
  lastCard = totalCards[lastCardIndex];
  totalCards = totalCards.slice(0, lastCardIndex).concat(totalCards.slice(lastCardIndex + 1));
  while(totalCards.length > 0) {
    for (username in usernames) {
      var x = Math.floor((Math.random() * totalCards.length));
      userCards[username].push(totalCards[x]);
      totalCards = totalCards.slice(0, x).concat(totalCards.slice(x + 1));
    }
  }
}

// Update userCards, lastCard
// return if false, the user wins and the game is finished.
function updateCards(username, card) {
  var cards = userCards[username];
  var indexOfCards = cards.indexOf(card);
  if (indexOfCards == -1) {
    return true;
  }

  var lastCardNumber = lastCard.slice(0, lastCard.length - 1);
  var lastCardType = lastCard.slice(lastCard.length - 1, lastCard.length);
  var cardNumber = card.slice(0, card.length - 1);
  var cardType = card.slice(card.length - 1, card.length);
  if (cardNumber != lastCardNumber && cardType != lastCardType) {
    return true;
  }

  // update last card
  lastCard = card;

  // remove the card from the user's cards
  cards = cards.slice(0, indexOfCards).concat(cards.slice(indexOfCards + 1));
  userCards[username] = cards;

  return cards.length != 0;
}

// Return response string
function toStringCards(username) {
  return lastCard + ' == ' + userCards[username];
}

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    if (data === 'start') {
      if (started) {
	socket.broadcast.send('new message', {
	  username: 'Server',
          message: 'Already started'
	});
      } else {
	started = true;
	initCards();
	socket.emit('new message', {
	  username: 'Server',
          message: 'Start Game!'
	});
	socket.broadcast.emit('new message', {
	  username: 'Server',
          message: 'Start Game!'
	});

	var list = Object.keys(sockets);
	for (var i = 0; i < list.length; i++) {
          var s = sockets[list[i]];
          s.emit('new message', {
            username: 'Cards',
	    message: toStringCards(s.username)
	  });
        }
      }
    } else {
      if (!updateCards(socket.username, data)) {
	socket.emit('new message', {
	  username: 'Server',
          message: 'You WIN!'
	});
	socket.broadcast.emit('new message', {
	  username: 'Server',
          message: socket.username + ' WIN!'
	});
	started = false;
      } else {
	var list = Object.keys(sockets);
	for (var i = 0; i < list.length; i++) {
          var s = sockets[list[i]];
          s.emit('new message', {
            username: 'Cards',
	    message: toStringCards(s.username)
	  });
        }
      }
    }
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    sockets[username] = socket;
    userCards[username] = [];
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
