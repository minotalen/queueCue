/* global io */

// IFFY  immediately invoked function expression  --- limits scope
// (function () {

var TYPING_TIMER_LENGTH = 400; // ms
var COLORS = [
  "#e21400",
  "#c27513",
  "#f8a700",
  "#f78b00",
  "#58dc00",
  "#8cde87",
  "#a8f07a",
  "#4ae8c4",
  "#3b88eb",
  "#5677d1",
  "#a700ff",
  "#d300e7"
];

// Initialize variables
var $window = $(window);
var $usernameInput = $(".usernameInput"); // Input for username
var $confirmName = $(".confirmName"); // Input for username
var $eventlog = $(".eventlog"); // event log area
var $error = $(".error"); // Login Error area
var $inputMessage = $(".inputMessage"); // Input message input box
var $modArea = $(".modArea"); // hands display box
var $hands = $(".handsArea"); // hands display box

var $speaker = $(".speakerArea"); // hands display box
var $reply = $(".replyArea"); // hands display box

var $button = $(".button");
var $buttons = $(".buttonArea");
var $raiseHand = $(".raiseHand");
var $directHand = $(".directHand");
var $cueButton = $(".cueButton");
var $logButton = $(".logButton");
var $removeOption = $(".removeOption");
var $softnessOption = $(".softnessOption");
var $clearOption = $(".clearOption");

var $name = $(".name");
var $raisedAmount = $(".raisedAmount");

var $loginPage = $(".login.page"); // The login page
var $chatPage = $(".chat.page"); // The chatroom page

// $confirmName.on("touchstart", setUsername);
// $raiseHand.on("touchstart", raiseHand);
// $directHand.on("touchstart", directHand);
// $cueButton.on("touchstart", cueSpeaker);

// Prompt for setting a username
var username;
var isMod = false;
var connected = false;
var typing = false;
var raisedCount = 0;
// person who is current speaker
var speaker = "";
// person who is currently replying
var replyer = "";

var currentPos = 999;
var handRaised = false;
var directRaised = false;

var lastTypingTime;
var $currentInput = $usernameInput.focus();

var socket = io();

var options = {
  removeOnLeave: true,
  maxQueueDisplay: 11,
  quoteSoftness: 1
};

var favicon = new Favico({
  type: "rectangle",
  animation: "slide",
  bgColor: "#DA81F5",
  textColor: "#000"
});


function restore(userList) {
  socket.emit("restore", { users: userList });
}

function softSort(quoteSoftness, addQ) {
  // softSort(0, [1], [1, 2, 4, 2, 3, 0]);

  let queue = [];
  console.log("running queue emulation with softness " + quoteSoftness);
  while (addQ.length) {
    console.log("current queue: " + queue + ", to add: " + addQ);
    queue.unshift(addQ.shift()); // adds the first element of addQ to the end of queue
    for (let index = 0; index < queue.length; index++) {
      for (let user = 1; user < queue.length - index; user++) {
        if (queue[user] > queue[user - 1] + quoteSoftness) {
          // if current number is bigger than previous + softness, swap them
          console.log(
            "    swapping pos",
            user - 1,
            "with pos",
            user,
            "values: ",
            queue[user],
            " / ",
            queue[user - 1]
          );
          [queue[user], queue[user - 1]] = [queue[user - 1], queue[user]]; // swaps the 2 positions (smaller numbers move towards the right))
        }
      }
    }
  }
  return queue;
}

function softSortt(quoteSoftness, addQ) {
  let queue = [];
  while (addQ.length) {
    queue.unshift(addQ.shift());
    for (let index = 0; index < queue.length; index++) {
      for (let user = 1; user < queue.length - index; user++) {
        if (queue[user] > queue[user - 1] + quoteSoftness) {
          [queue[user], queue[user - 1]] = [queue[user - 1], queue[user]];
        }
      }
    }
  }
  return queue;
}

//  #####################  dark mode toggle #########################################
const toggleSwitch = document.querySelector(
  '.theme-switch input[type="checkbox"]'
);
const currentTheme = localStorage.getItem("theme")
  ? localStorage.getItem("theme")
  : null;

let css = document.styleSheets[0].cssRules[0].style;
const currentSize = localStorage.getItem("font-size")
  ? localStorage.getItem("font-size")
  : null;

if (currentSize) {
  // console.log("loaded size", currentSize);
  css.setProperty("--font-size", currentSize);
}

function switchTheme() {
  let toggle = $("#checkbox")[0];
  if (toggle.checked) {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
}

if (currentTheme) {
  document.documentElement.setAttribute("data-theme", currentTheme);
  if (currentTheme === "light") {
    toggleSwitch.checked = true;
  }
}

toggleSwitch.addEventListener("change", switchTheme, false);

// ################# KEYBOARD ###################################################

$window.keydown(function(event) {
  if ($chatPage.is(":visible")) {
    if (event.key == "h" && username) raiseHand();
    if (event.key == "d" && username && replyer != username) directHand();
    // if(event.key == "m") makeMeMod();

    if (event.key == "c" && (isMod || speaker == username)) cueSpeaker();
    // if (event.key ==    "-") startDemo();
    // if (event.key == "l" && isMod) {
    //   console.log("toggling log", $modArea.is(":visible"));
    //   toggleLog();
    // }
  }
});
// ############# MOD AND OPTIONS     ##################################################
function makeMeMod() {
  if (!isMod) {
    isMod = true;
    // $raiseHand.addClass('hide');
    // $directHand.addClass('hide');
    $buttons.css("grid-template-rows", "1fr 1fr");
    $cueButton.removeClass("hide");
    $cueButton.css("grid-column", "2");
    $cueButton.css("grid-row", "2");
    $logButton.removeClass("hide");
    
    socket.emit("request options");
    return "You are now a moderator...";
  }
}

function toggleLog() {
  if (!$modArea.hasClass("hide")) {
    $logButton.removeClass("active");
    $modArea.addClass("hide");
    $hands.removeClass("hide");
    $softnessOption.addClass("hide");
    $removeOption.addClass("hide");
    $clearOption.addClass("hide");

    if(speaker != username) {
      $raiseHand.removeClass("hide");
      $directHand.removeClass("hide");
    }
  } else {
    $logButton.addClass("active");
    $modArea.removeClass("hide");
    $hands.addClass("hide");

    if (options.removeOnLeave == true) {
      $removeOption.addClass("active");
    } else {
      $removeOption.removeClass("active");
    }
    $raiseHand.addClass("hide");
    $directHand.addClass("hide");
    
    $softnessOption.removeClass("hide");
    $removeOption.removeClass("hide");
    $clearOption.removeClass("hide");
  }
}

// OPTIONS ##########################################

function optionRemoveOnLeave(input) {
  options.removeOnLeave = input;
  socket.emit("options", {... options, toggleROL: true});
}

function incrementSoftness() {
  socket.emit("options", { ...options, softness: true });
}

function clear(clrDirect = true, clrHands = true) {
  console.log("clearing queue");
  if (clrDirect && isMod) {
    socket.emit("clear direct");
  }
  if (clrHands && isMod) {
    socket.emit("clear hands");
  }
  if ((clrHands || clrDirect) && isMod) {
    socket.emit("new message", "has cleared the queue");
  }
}

// NOTIFICATIONS & TITLE ##################################################################

// finds the user position in the combined queue
function findPosInQueue(name, replyArray, handsArray) {
  let pos = 0;
  let fullArray = replyArray.concat(handsArray); // joins the two arrays
  if (fullArray.length == 0) return 998; // nobody in the queue
  for (let i = 0; i < fullArray.length; i++) {
    if (fullArray[i] == name) {
      pos = i; // position in the queue (starting at 0 for first)
      break;
    }
    pos = 999; // name not in queue
  }
  return pos;
}

// sets the text of the title based on queue position
function titleText(pos) {
  let speakUp = "! Your turn to speak !";
  let firstPos = ". You're up next! .";
  let notQueued = "Not in the queue.";
  let emptyQueue = "Queue is empty";
  if (pos == 0) {
    document.title = firstPos;
  } else if (pos == 999) {
    document.title = notQueued;
  } else if (pos == 998) {
    document.title = emptyQueue;
  } else {
    document.title = `Position ${pos + 1} in the queue.`;
  }

  if (speaker == username || replyer == username) {
    document.title = speakUp;
    favicon.badge("!!!");
    return;
  }
  // console.log("position in queue: ", pos, "   previous position: ", currentPos);
  // NOTIFICATION SOUNDS
  // if (currentPos == 1 && pos == 0) nextSound.play();

  if (pos < 10 && pos != currentPos) {
    favicon.badge(pos + 1);
  }
  if (pos == 998 || pos == 999) favicon.badge(0);
  currentPos = pos;
}

// ################# AUDIO    ###################################################
var nextSound, speakSound;
$(document).ready(function() {
  nextSound = document.createElement("audio");
  nextSound.setAttribute(
    "src",
    "https://cdn.glitch.com/19a8c08b-3360-4881-8fc4-9fc8748478ce%2Fsharp-592.mp3?v=1606959394544"
  );

  speakSound = document.createElement("audio");
  speakSound.setAttribute(
    "src",
    "https://cdn.glitch.com/19a8c08b-3360-4881-8fc4-9fc8748478ce%2Fjust-saying-593.mp3?v=1606959395695"
  );
});

// ################# VOTES    ###################################################

function voteSpeakerKick() {
  console.log("vote speaker kick");
  socket.emit("vote speaker kick");
}

// ################# BUTTONS    ###################################################

// raise or lower user hand, add/remove from queue
function raiseHand() {
  // console.log("hand raised clicked", handRaised);
  if (speaker != username) {
    if (!handRaised) {
      // tell server to raise user hand
      socket.emit("raise hand");
      // console.log("raising hand");
      handRaised = true;
      $raiseHand.addClass("active");
    } else {
      socket.emit("lower hand");
      // console.log("hand lowered");
      handRaised = false;
      $raiseHand.removeClass("active");
    }
  }
}

function directHand() {
  // console.log("direct reply clicked", directRaised);
  if (speaker != username) {
    if (!directRaised) {
      // tell server to raise user hand
      socket.emit("raise reply");
      // console.log("instant reply");
      directRaised = true;
      $directHand.addClass("active");
    } else {
      socket.emit("lower reply");
      // console.log("instant reply");
      directRaised = false;
      $directHand.removeClass("active");
    }
  }
}

// ################# SOCKET RECEIVE ######################################

function updateHands(replyArray, handsArray) {
  $hands.empty();

  let ownBuffer = 0; // all own add +1 element because of the span
  // draw all direct
  // if(replyArray >= 1) $hands.append('<h4> Direct: </h4>');
  if (replyArray.length != 0)
    $hands.append("<span class='headline'> Direct: </span>");
  for (let i = 0; i < replyArray.length; i++) {
    if (cleanInput(replyArray[i]) == username) {
      $hands.append(
        "<div class='singleHand'> <span class='ownHand'>" +
          cleanInput(replyArray[i])
      ) + "</span></div>";
      ownBuffer++;
      // on reconnect, add class again
      // console.log("instant reply");
      directRaised = true;
      $directHand.addClass("active");
    } else {
      $hands.append("<div class='replyHand'> " + cleanInput(replyArray[i])) +
        "</div>";
    }
    var matched = $(".handsArea *");
    if (matched.length > options.maxQueueDisplay + ownBuffer + 2) {
      // +2 because of hr & h3
      $hands.append("<div class='moreInQueue'> ... </div>");
      return;
    }
  }

  // horizontal line betwen direct and direct
  if (replyArray.length != 0 && handsArray.length != 0) $hands.append("<hr>");
  if (handsArray.length != 0)
    $hands.append("<span class='headline'> Queue: </span>");

  // draw all raised hands
  for (let i = 0; i < handsArray.length; i++) {
    if (cleanInput(handsArray[i]) == username) {
      $hands.append(
        "<div class='singleHand'><span class='ownHand'>" +
          cleanInput(handsArray[i])
      ) + "</span></div>";
      // console.log("raising hand");
      ownBuffer++;
      // on reconnect, add class again
      handRaised = true;
      $raiseHand.addClass("active");
    } else {
      $hands.append("<div class='singleHand'> " + cleanInput(handsArray[i])) +
        "</div>";
    }
    var matched = $(".handsArea *");
    if (matched.length > options.maxQueueDisplay + ownBuffer + 2) {
      // +2 because of hr & h3
      $hands.append("<div class='moreInQueue'> ... </div>");
      return;
    }
  }

  //update text for title bar
  titleText(findPosInQueue(username, replyArray, handsArray));
}

function updateSpeaker(data) {
  // TODO: if clause to filter twice in a row and self-reply
  if (data.isDirect && data.speaking == username) {
    // speaking direct now
    // console.log("speaking direct now");
    speakSound.play();
    directRaised = false;
    $directHand.removeClass("active");
    if (!isMod) {
      $cueButton.addClass("hide");
    }
    $raiseHand.removeClass("hide");
    $directHand.addClass("hide");
  } else if (!data.isDirect && data.speaking == username) {
    // speaking regular now
    // console.log("speaking regular now");
    speakSound.play();
    raisedCount++;
    updateNameBox(username, raisedCount);
    handRaised = false;
    $raiseHand.removeClass("active");

    if (!isMod) {
      $cueButton.removeClass("hide");
      $cueButton.css("grid-column", "1/3");
      $cueButton.css("grid-row", "1/3");
    } else {
      $cueButton.css("grid-column", "2/3");
      $cueButton.css("grid-row", "2/3");
    }

    $raiseHand.addClass("hide");
    $directHand.addClass("hide");
  }

  if (data.isDirect) {
    //clear replyer div
    $reply.empty();
    replyer = data.speaking;
    if (data.speaking == "") return;
    // console.log("updating replyer: ", replyer);
    if (replyer == username) {
      $reply.append(
        "<p><i>Direct:</i> <br> <span class='ownHand'>" + replyer + "</p>"
      );
    } else {
      $reply.append("<p><i>Direct:</i> <br>" + replyer + "</p>");
    }
  } else {
    speaker = data.speaking;
    // console.log("updating speaker: ", speaker);
    //clear speaker and replyer divs
    $reply.empty();
    replyer = "";
    $speaker.empty();
    if (data.speaking == "") return;
    if (speaker == username) {
      $speaker.append(
        "<p><i>Speaker: </i> <br> <span class='ownHand'>" + speaker + "</span></p>"
      );
    } else {
      $speaker.append("<p><i>Speaker:</i> <br>" + speaker + "</p>");
    }
  }

  console.log(speaker, replyer);
  if (!isMod && speaker != username && replyer != username) {
    // not speaking (anymore)
    console.log("not speaking (anymore)");
    $cueButton.css("grid-column", "1");
    $cueButton.addClass("hide");

    $raiseHand.removeClass("hide");
    $directHand.removeClass("hide");
  } else if (isMod && speaker != username && replyer != username && $modArea.hasClass("hide")) {
    $raiseHand.removeClass("hide");
    $directHand.removeClass("hide");
  }
}

// ################# SOCKET SEND ######################################
function cueSpeaker() {
  if (username == speaker || isMod) {
    socket.emit("next hand");
  } else {
    console.log("not speaker or mod", speaker, username, isMod);
  }
}

// ###############################################################################

function addParticipantsMessage(data) {
  var message = "";
  if (data.numUsers === 1) {
    message += "there's 1 participant, you :)";
  } else {
    message += "there are " + data.numUsers + " participants";
  }
  log(message);
}

// ################## 'REGISTRATION'  #################################

$(document).ready(function() {
  loadName();
});

function saveName(name) {
  var id = $usernameInput.attr("id");
  var value = name;
  localStorage.setItem(id, value);
}

function loadName() {
  var id = $usernameInput.attr("id");
  var value = localStorage.getItem(id);
  // console.log("setting name", localStorage.getItem(id));
  $usernameInput.val(value);
}

// Sets the client's username
function setUsername() {
  username = cleanInput($usernameInput.val().trim());
  saveName(username);
  if (username.length < 3) {
    $error.empty();
    $error.append("Please use a name longer than 2 characters.");
    username = false;
    return;
  }

  // If the username is valid
  if (username) {
    // Tell the server your username
    socket.emit("add user", username);
    // verifyUsername();
  }
}

// username is unique
function verifyUsername() {
  // if(username == "mod") makeMeMod();
  $loginPage.addClass("hide");
  $loginPage.off("click");
  $chatPage.removeClass("hide");
  $modArea.addClass("hide");
  $currentInput = $inputMessage.focus();
}

// Sends a chat message
function sendMessage() {
  var message = $inputMessage.val();
  // Prevent markup from being injected into the message
  message = cleanInput(message);
  // if there is a non-empty message and a socket connection
  if (message && connected) {
    $inputMessage.val("");
    addChatMessage({
      username: username,
      message: message
    });
    // tell server to execute 'new message' and send along one parameter
    socket.emit("new message", message);
  }
}

// Log a message
function log(message, options) {
  var $el = $("<li>")
    .addClass("log")
    .text(message);
  addMessageElement($el, options);
  
}

// Adds the visual chat message to the message list
function addChatMessage(data, options) {
  options = options || {};
  var $usernameDiv = $('<span class="username"/>')
    .text(data.username)
    .css("color", getUsernameColor(data.username));
  var $messageBodyDiv = $('<span class="messageBody">').text(data.message);

  var typingClass = data.typing ? "typing" : "";
  var $messageDiv = $('<li class="message"/>')
    .data("username", data.username)
    .append($usernameDiv, $messageBodyDiv);

  addMessageElement($messageDiv, options);
}

// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)

function addMessageElement(el, options) {
  var $el = $(el);
  $eventlog.prepend($el);

  // idk.... just prepend for now???
  // $$eventlog[0].animate({ scrollTop: $eventlog[0]..scrollHeight}, 1000);
  // $eventlog.scrollTop = $eventlog.scrollHeight;
  // $eventlog.animate({ scrollTop: $eventlog.height() }, "slow")
  // $eventlog[0].offsetHeight
}

// Prevents input from having injected markup
function cleanInput(input) {
  return $("<div/>")
    .text(input)
    .text();
}

// Gets the color of a username through our hash function
function getUsernameColor(username) {
  // Compute hash code
  var hash = 7;
  for (var i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + (hash << 5) - hash;
  }
  // Calculate color
  var index = Math.abs(hash % COLORS.length);
  let toggle = $("#checkbox")[0];
  if(username == "options:") {
    return 'var(--font-color)';
  }
  return COLORS[index];
}

// Keyboard events

$window.keydown(function(event) {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    $currentInput.focus();
  }
  // When the client hits ENTER on their keyboard and is not registered
  if (event.which === 13 && !username) {
    // console.log("trying to set username...");
    setUsername();
  }
});

// Click events

// Focus input when clicking anywhere on login page
$loginPage.on("click touch", function() {
  $currentInput.focus();
});

// Focus input when clicking on the message input's border
$inputMessage.on("click touch", function() {
  $inputMessage.focus();
});

function updateNameBox(uname, raised) {
  $name.html(uname);
  if (raised == 1) $raisedAmount.html("talked once");
  else if (raised > 0) $raisedAmount.html("talked " + raisedCount + " times");
}

// ############################################################################################### Socket events

socket.on("next speaker", function(data) {
  // console.log("speaker: ", data.speaking, "  direct: ", data.isDirect);
  updateSpeaker(data);
});

socket.on("hand update", function(data) {
  updateHands(data.direct, data.hands);
});

// Whenever the server emits 'login', log the login message
socket.on("login", function(data) {
  connected = true;
  // makes the first user a mod
  if (data.makeMod) {
    makeMeMod();
  }
  // Display the welcome message
  var message = "queueCue prototype";
  log(message, {
    prepend: true
  });
  addParticipantsMessage(data);
  updateNameBox(data.username, data.raised);
});

// Whenever the server emits 'new message', update the chat body
socket.on("new message", function(data) {
  // console.log("new message", data);
  addChatMessage(data);
});

// Whenever the server emits 'user joined', log it in the chat body
socket.on("user joined", function(data) {
  log(data.username + " joined");
  addParticipantsMessage(data);
});

// Whenever the server emits 'user left', log it in the chat body
socket.on("user left", function(data) {
  log(data.username + " left");
  addParticipantsMessage(data);
});

socket.on("valid name", function() {
  verifyUsername();
});

socket.on("invalid name", function(data) {
  username = false;
  $error.empty();
  if (data == "inUse") $error.append("This name is already in use");
  if (data == "userOnline") $error.append("welp, this sucks");
});

socket.on("send options", function(data) {
   options = { ...options, ...data};
   // console.log(options);
   if (options.removeOnLeave == true) {
     $removeOption.addClass("active");
   } else {
     $removeOption.removeClass("active");
   }
  var $softnessValue = $(".softnessValue");
  $softnessValue.html(options.quoteSoftness)
});

// })();
