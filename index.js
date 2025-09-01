// Setup basic express server
let express = require("express");
let app = express();
let server = require("http").createServer(app);
let io = require("socket.io")(server);
let port = process.env.PORT || 3000;

// todo add tripcodes
// var tripcode = require('tripcode');
// tripcode(password)

class User {
  constructor(name, raised, online) {
    this.name = name;
    this.raised = raised;
    this.online = online;
  }
}


server.listen(port, function() {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static("public"));

/*
app.get("/wakeup", function(request, response) {
  console.log("i'm awake");
  response.send("i'm awake");
});
*/
// Chatroom

let modName = ""; // empty if no mod
let numUsers = 0;
let userList = [];
let raisedList = [];
let hands = [];
let direct = [];

let speaking = "";
let directR = "";
let isDirect = false;
var kickVotes = [];

// global settings
let options = {
  removeOnLeave: false,
  quotierung: true,
  quoteSoftness: 0
}

io.on("connection", function(socket) {
  var addedUser = false;
  // ###############################################################################
  // restore package contains list of users, hands and direct array
  socket.on("restore", function(data) {
    userList = data.users;
    // hands = data.hands;
    // direct = data.direct;
  });
            
  socket.on("options", function(data) {
    if (data.softness == true) {
      // cycles 0 1 2 0
      if(options.quoteSoftness < 2) options.quoteSoftness++;
      else options.quoteSoftness = 0;
      io.emit("new message", {
        username: 'options:',
        message: " queue softness set to " + options.quoteSoftness
      });
    }
    if (data.toggleROL) {
      if (data.removeOnLeave == true) {
        options.removeOnLeave = true;
        for (let item in userList) {
          if (
            hands.includes(userList[item]) ||
            direct.includes(userList[item]) ||
            speaking == userList[item] ||
            directR == userList[item]
          ) {
            userList.splice(item, 1);
          }
        }
        io.emit("new message", {
          username: 'options:',
          message: " users leave queue on disconnect"
        });
      } else {
        options.removeOnLeave = false;
        io.emit("new message", {
          username: 'options:',
          message: " users stay in queue on disconnect"
        });
      }
    }
    console.log("options updated", options);
    socket.emit("send options", options);
  });
  
  socket.on("request options", function() {
     socket.emit("send options", options);
  });

  socket.on("raise hand", function() {
    if (speaking == "") {
      speaking = socket.username;
      // direct = spliceFrom(direct, speaking); // remove new speaker from directs
      io.emit("next speaker", {
        speaking: speaking,
        isDirect: false
      });
      io.emit("new message", {
        username: speaking,
        message: " is now speaking"
      });
      let speakerIndex = userList.findIndex(x => x.name === speaking);
      // console.log(userList)
      if (speaking != "" && speakerIndex != -1) {
        userList[speakerIndex].raised += 1;
        console.log(
          speaking,
          "is speaking the",
          userList[speakerIndex].raised,
          "time"
        );
      }
      console.log(userList);
      return;
    }
    hands.push(socket.username);
    // sort by amount of time raised (quotierung)
    // TODO explain quoteSoftness
    if (options.quotierung) {
      for (let index = 0; index < hands.length; index++) {
        for (let user = 1; user < hands.length-index; user++) {
          let speakerIndex = userList.findIndex(x => x.name === hands[user]); // current position
          let lastSpeakerIndex = userList.findIndex(x => x.name === hands[user-1]); // previous in line
          if(lastSpeakerIndex != -1 && speakerIndex != -1 && userList[speakerIndex].raised < userList[lastSpeakerIndex].raised-options.quoteSoftness ) { //swap
            // console.log("swapping ", userList[speakerIndex].name, userList[speakerIndex].raised, "with", userList[lastSpeakerIndex].name, userList[lastSpeakerIndex].raised);
            [hands[user], hands[user-1]] = [hands[user-1], hands[user]];
          }
        }
      }
    }
    
    io.emit("new message", {
      username: socket.username,
      message: " has raised their hand"
    });
    io.emit("hand update", { direct, hands });
  });

  socket.on("lower hand", function() {
    var index = hands.indexOf(socket.username);
    if (index !== -1) {
      hands.splice(index, 1);
    }

    io.emit("new message", {
      username: socket.username,
      message: " has lowered their hand"
    });
    if (options.quotierung) {
      for (let index = 0; index < hands.length; index++) {
        for (let user = 1; user < hands.length-index; user++) {
          let speakerIndex = userList.findIndex(x => x.name === hands[user]); // current position
          let lastSpeakerIndex = userList.findIndex(x => x.name === hands[user-1]); // previous in line
          if( userList[speakerIndex].raised < userList[lastSpeakerIndex].raised-options.quoteSoftness ) { //swap
            [hands[user], hands[user-1]] = [hands[user-1], hands[user]];
          }
        }
      }
    }
    io.emit("hand update", { direct, hands });
  });

  socket.on("raise reply", function() {
    direct.push(socket.username);

    io.emit("new message", {
      username: socket.username,
      message: " has a direct reply"
    });
    io.emit("hand update", { direct, hands });
    // console.log(hands);
  });

  socket.on("lower reply", function() {
    var index = direct.indexOf(socket.username);
    if (index !== -1) {
      direct.splice(index, 1);
    }

    io.emit("new message", {
      username: socket.username,
      message: " has no question anymore"
    });
    io.emit("hand update", { direct, hands });
    io.emit("next hand");
  });

  socket.on("next hand", function() {
    console.log("next hand called ");
    console.log(userList);
    if (hands.length == 0 && direct.length == 0) {
      speaking = '';
      io.emit("new message", {
          username: "clear",
          message: " the speaker queue"
      });
      console.log("queue cleared");
      io.emit("next speaker", { speaking, isDirect: false });
      return;
    }
    if (hands.length >= 1 || direct.length >= 1) {
      if (direct.length >= 1) {
        directR = direct.shift();
        io.emit("new message", {
          username: directR,
          message: " may now ask"
        });
        io.emit("next speaker", { speaking: directR, isDirect: true }); // broadcast direct replier to clients
      } else {
        speaking = hands.shift();
        io.emit("new message", {
          username: speaking,
          message: " is now speaking"
        });
        const speakerIndex = userList.findIndex(x => x.name === speaking);
        if(speakerIndex != -1) {
          userList[speakerIndex].raised += 1;
          console.log(
            speaking,
            "is speaking the",
            userList[speakerIndex].raised,
            "time"
          );
        }
        directR = '';
        // direct = spliceFrom(direct, speaking); // remove new speaker from directs
        io.emit("next speaker", { speaking, isDirect: false }); // broadcast next speaker to clients
      }
      io.emit("hand update", { direct, hands });
    } else {
      console.log("no hands raised");
    }
  });

  socket.on("clear queue", function(data) {
    if (socket.username == modName) {
      hands = [];
    }
  });

  socket.on("clear direct", function(data) {
    if (socket.username == modName) {
      direct = [];
    }
  });

  // when the client emits 'new message', this listens and executes
  socket.on("new message", function(data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit("new message", {
      username: socket.username,
      message: data,
      hand: hands
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on("add user", function(username) {
    // user with this name registered
    const userFound = userList.findIndex(x => x.name === username);

    if (userFound != -1 && userList[userFound].online) {
      // if there is an online user with that name
      socket.emit("invalid name", "inUse");
      return;
    }

    if (addedUser) {
      console.log("user already added");
      socket.emit("invalid name", "userOnline");
      return;
    }

    // we store the username in the socket session for this client
    socket.username = username;
    if (userFound != -1 && !userList[userFound].online) {
      userList[userFound].online = true;
    } else {
      userList.push(new User(socket.username, 0, true));
    }
    socket.emit("valid name");

    ++numUsers;

    var makeMod = false; //dont make user a mod...
    if (modName == "" || modName == socket.username) makeMod = true; // except if there is no mod
    console.log("new user:", socket.username, "is mod:", makeMod);
    addedUser = true;

    let raisedAmount;
    if (userFound != -1) {
      raisedAmount = userList[userFound].raised;
    } else {
      raisedAmount = 0;
    }
    socket.emit("login", {
      numUsers: numUsers,
      hands: hands,
      username: socket.username,
      raised: raisedAmount,
      makeMod: makeMod
    });

    if (modName == "") {
      // if there is no mod in the room
      modName = socket.username;
      io.emit("new message", {
        username: socket.username,
        message: " gets mod status as first user"
      });
    }

    // echo globally (all clients) that a person has connected
    socket.broadcast.emit("user joined", {
      username: socket.username,
      numUsers: numUsers
    });

    //
    if (speaking != "") {
      socket.emit("next speaker", {
        speaking: speaking,
        isDirect: false
      });
    }
    if (directR != "") {
      socket.emit("next speaker", {
        speaking: directR,
        isDirect: true
      });
    }
    socket.emit("hand update", { direct, hands });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", function() {
    socket.broadcast.emit("typing", {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", function() {
    socket.broadcast.emit("stop typing", {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function() {
    if (addedUser) {
      --numUsers;
      // remove user from list of online users
      var userIndex = userList.findIndex(x => x.name === socket.username);

      if (userIndex !== -1 && options.removeOnLeave) {
        userList.splice(userIndex, 1);
      } else {
        userList[userIndex].online = false;
      }
      if (numUsers == 0) {
        modName = ""; // empty if no mod
        numUsers = 0;
        userList = [];
        hands = [];
        direct = [];

        speaking = "";
        directR = "";
        isDirect = false;
      }

      // remove user from the queue if removeOnLeave is true
      if (options.removeOnLeave) {
        console.log(socket.username, socket.isMod);

        if (modName == socket.username) modName = "";

        var index = hands.indexOf(socket.username);
        if (index !== -1) {
          hands.splice(index, 1);
        }
        var replyIndex = direct.indexOf(socket.username);
        if (replyIndex !== -1) {
          direct.splice(replyIndex, 1);
        }
        io.emit("hand update", { direct, hands });
        console.log("user ", socket.username, " left. ", speaking, directR);
        if (speaking == socket.username) {
          console.log("speaker quit");
          speaking = "";
          io.emit("next speaker", {
            speaking: "",
            isDirect: false
          });
        }
        if (directR == socket.username) {
          console.log("direct quit");
          directR = "";
          io.emit("next speaker", {
            speaking: "",
            isDirect: true
          });
        }
      }

      // echo globally that this client has left
      socket.broadcast.emit("user left", {
        username: socket.username,
        numUsers: numUsers
      });
      console.log(userList);
    }
  });
});