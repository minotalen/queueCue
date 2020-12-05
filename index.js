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

app.get("/wakeup", function(request, response) {
  console.log("i'm awake");
  response.send("i'm awake")
});

// Chatroom

let modName = "" // empty if no mod
let numUsers = 0;
let userList = [];
let hands = [];
let replies = [];

let speaking = "";
let directR = "";
let isDirect = false;
var kickVotes = [];


// global settings

let removeOnLeave = true

io.on('connection', function (socket) {
  var addedUser = false;

  
  // ###############################################################################
  socket.on('options', function (data) {
    if(data.removeOnLeave == true) {
      removeOnLeave = true;
      for(let item in userList) {
        if(hands.includes(userList[item]) || 
           replies.includes(userList[item]) || 
           speaking == userList[item] ||
           directR == userList[item]) {
          userList.splice(item, 1);
        }
      }
    } else {
      removeOnLeave = false;
    }
    
  });
            
  socket.on('raise hand', function () {
    if(speaking == "") {
      speaking = socket.username;
      // replies = spliceFrom(replies, speaking); // remove new speaker from directs
      io.emit('next speaker', {
        speaking: speaking, 
        isDirect: false
      });
      io.emit('new message', {
          username: speaking,
          message: "is now speaking"
        });
      return;
    }
    hands.push(socket.username);
    
    io.emit('new message', {
      username: socket.username,
      message: "has raised their hand"
    });
    io.emit('hand update', {replies, hands});
  });
  
  socket.on('vote speaker kick', function () {
    if(!kickVotes.includes(socket.username)){
      io.emit('new message', {
        username: socket.username,
        message: "voted to kick the current speaker"
      });
      // register vote to kick user
      kickVotes.push(socket.username);
      var kickThreshold = Math.max(Math.floor(numUsers/3),2); // at least 2 voted to kick, otherwise 1/3rd of users rounded down
      if(kickThreshold <= kickVotes.length) {
        // emit kick
        io.emit('new message', {
          username: speaking,
          message: "was removed as speaker by community vote"
        });
        io.emit('hand update', {replies, hands});
      }
    }
    
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
    io.emit('next hand');
  });
  
  
  socket.on('next hand', function () {
    console.log("next hand called ");
    if(hands.length >= 1 || replies.length >=1) {
      if(replies.length >= 1) {
        directR = replies.shift();  
        isDirect = true;
      } else {
        speaking = hands.shift(); 
        isDirect = false;
      }
      if(isDirect){
        kickVotes = [];
        io.emit('new message', {
          username: directR,
          message: "may now ask"
        });        
        
        io.emit('next speaker', {speaking: directR, isDirect: true}); // broadcast direct replier to clients

      } else {
        kickVotes = [];
        io.emit('new message', {
          username: speaking,
          message: "is now speaking"
        });
        // replies = spliceFrom(replies, speaking); // remove new speaker from directs
        io.emit('next speaker', {speaking, isDirect}); // boadcast next speaker to clients
      }
      io.emit('hand update', {replies, hands});
    } else {
      console.log("no hands raised");
    }
  });

// function spliceFrom(arrayToSpliceFrom, thingToSplice) {
//     console.log("splicing ", thingToSplice, " from ", arrayToSpliceFrom, "   ", arrayToSpliceFrom.indexOf(thingToSplice) );
  
//     var index = arrayToSpliceFrom.indexOf(thingToSplice);
//     if (index !== -1) {
//       // console.log("actually splicing", index, arrayToSpliceFrom[index], arrayToSpliceFrom.splice(0, 1));
//       arrayToSpliceFrom.splice(index, 1);
//       return arrayToSpliceFrom
//     }
//     console.log("no splice");
//     return arrayToSpliceFrom;
// }


  
  
  // ###############################################################################
  
  
  socket.on('clear queue', function (data) {
    if(socket.username == modName ) {
      hands = [];
    }
  });
  
  socket.on('clear direct', function (data) {
    if(socket.username == modName ) {
      replies = [];
    }
  });
  
  
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
      socket.emit('invalid name', "userOnline");
      return;
    }

    // we store the username in the socket session for this client
    socket.username = username;
    userList.push(socket.username);
    socket.emit('valid name');

    
    ++numUsers;
    
    var makeMod = false; //dont make user a mod...
    if( modName == "") makeMod = true; //except if there is no mod
    console.log("new user", socket.username, makeMod);
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers,
      hands: hands,
      makeMod: makeMod
    });
    
    if( modName == "" ) { // if there is no mod in the room
      modName = socket.username;
      io.emit('new message', {
          username: socket.username,
          message: "gets mod status as first user"
      });
    }
    
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
      if(numUsers == 0) {
        modName = "" // empty if no mod
        numUsers = 0;
        userList = [];
        hands = [];
        replies = [];

        speaking = "";
        directR = "";
        isDirect = false;
      }
      
      // remove user from the queue if removeOnLeave is true
      if(removeOnLeave) {
        console.log(socket.username, socket.isMod);
     
        if(modName == socket.username) modName = "";

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