// Setup basic express server
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static('public'));

// Chatroom

let numUsers = 0;
let userList = [];
let hands = [];
let replies = [];

let speaking = "";
let directR = "";
let isDirect = false;


// global settings

let removeOnLeave = true

io.on('connection', function (socket) {
  var addedUser = false;

  
  // ###############################################################################
  socket.on('raise hand', function () {
    hands.push(socket.username);
    
    io.emit('new message', {
      username: socket.username,
      message: "has raised their hand"
    });
    io.emit('hand update', {replies, hands});
  });
  
  socket.on('lower hand', function () {
    var index = hands.indexOf(socket.username);
    if (index !== -1) {
      hands.splice(index, 1);
    }
    
    io.emit('new message', {
      username: socket.username,
      message: "has lowered their hand"
    });
    io.emit('hand update', {replies, hands});
  });
  
  socket.on('raise reply', function () {
    replies.push(socket.username);
    
    io.emit('new message', {
      username: socket.username,
      message: "has a direct reply"
    });
    io.emit('hand update', {replies, hands});
    // console.log(hands);
  });
  
  socket.on('lower reply', function () {
    var index = replies.indexOf(socket.username);
    if (index !== -1) {
      replies.splice(index, 1);
    }
    
    io.emit('new message', {
      username: socket.username,
      message: "has no question anymore"
    });
    io.emit('hand update', {replies, hands});
  });
  
  
  socket.on('next hand', function () {
    if(hands.length >= 1 || replies.length >=1) {
      if(replies.length >= 1) {
        directR = replies.shift();  
        isDirect = true;
      } else {
        speaking = hands.shift(); 
        isDirect = false;
      }
      if(isDirect){
        io.emit('new message', {
          username: directR,
          message: "may now ask"
        });
        io.emit('next speaker', {speaking: directR, isDirect});

      } else {
        io.emit('new message', {
          username: speaking,
          message: "is now speaking"
        });
        io.emit('next speaker', {speaking, isDirect});
      }
      io.emit('hand update', {replies, hands});
    } else {
      console.log("no hands raised");
    }
  });




  
  
  // ###############################################################################
  
  
  
  
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data,
      hand: hands
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // user with this name registered
    console.log(userList, userList.indexOf(username));
    if(userList.indexOf(username) != -1) {
      socket.emit('invalid name', "inUse");
      return;
    }
    
    if (addedUser) {
      console.log("user already added");
      return;
    }

    // we store the username in the socket session for this client
    socket.username = username;
    userList.push(socket.username);
    socket.emit('valid name');

    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers,
      hands: hands
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
    
    //
    if(speaking != "") {
      socket.emit('next speaker', {
        speaking: speaking, 
        isDirect: false
      });
    }
    if(directR != "") {
      socket.emit('next speaker', {
        speaking: directR, 
        isDirect: true
      });
    }
    socket.emit('hand update', {replies, hands});
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
    if (addedUser) {
      --numUsers;
      // remove user from list of online users
      var userIndex = userList.indexOf(socket.username);
      if (userIndex !== -1) {
        userList.splice(userIndex, 1);
      }
      
      // remove user from the queue if removeOnLeave is true
      if(removeOnLeave) {
        var index = hands.indexOf(socket.username);
        if (index !== -1) {
          hands.splice(index, 1);
        }
        var replyIndex = replies.indexOf(socket.username);
        if (replyIndex !== -1) {
          replies.splice(replyIndex, 1);
        }
        io.emit('hand update', {replies, hands});
        console.log("user ", socket.username, " left. ", speaking, directR);
        if(speaking == socket.username) {
          console.log("speaker quit");
          speaking = "";
          io.emit('next speaker', {
            speaking: "", 
            isDirect: false
          });
        }
        if(directR == socket.username) {
          console.log("direct quit");
          directR = "";
          io.emit('next speaker', {
            speaking: "", 
            isDirect: true
          });
        }
      }
      
      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});