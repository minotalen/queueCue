/* global io */

// $(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $hands = $('.handsArea');  // hands display box
  var $speaker = $('.speakerArea');  // hands display box
  var $buttons = $('.buttonArea');

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page



  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var speaker = "";
  var handRaised = false;
  var directRaised = false;
  
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();


  // ###############################################################################
  function makeMeMod () {
    console.log("You are now a moderator...")
    $buttons.append('<button id="button" onclick="nextSpeaker()">⏭️</button>');
  }

  function raiseHand () {
    console.log("hand raise clicked", handRaised)
    if(!handRaised) {
      // tell server to raise user hand
      socket.emit('raise hand');
      console.log("raising hand");
      handRaised = true;
    } else {
      socket.emit('lower hand');
      console.log("hand lowered");
      handRaised = false;
    }
  }

  function directHand () {
    console.log("direct reply clicked", directRaised)
    if(!directRaised) {
      // tell server to raise user hand
      socket.emit('raise reply');
      console.log("instant reply");
      directRaised = true;
    } else {
      socket.emit('lower reply');
      console.log("instant reply");
      directRaised = false;
    }
  }


  function updateHands (replyArray, handsArray) {
    $hands.empty();
    console.log(handsArray);
      $hands.append('<h3> Hands </h3>');
    if(replyArray >= 1) $hands.append('<h4> Replies </h4>');
    for(let i = 0; i < replyArray.length; i++) {
      $hands.append("<div class='replyHand'> 👋" + cleanInput(replyArray[i])) + "</div>";
    }

    for(let i = 0; i < handsArray.length; i++) {
      $hands.append("<div class='singleHand'>" + cleanInput(handsArray[i])) + "</div>";
    }
  }

  function updateSpeaker (data) {
    if(data.speaking == username && data.isDirect != speaker) {
      if(data.isDirect){
        directRaised = false;        
      } else {
        handRaised = false;
      }
    }
    
    speaker = data;
    console.log("updating speaker: ", data.speaking, " is direct? ", data.isDirect);
    
    $speaker.empty();
    if(data.isDirect){
        $speaker.append('<p> 👋 Direct: ' + data.speaking + '</p>');
    } else {
        $speaker.append('<p> Speaker: ' + data.speaking + '</p>');
    } 
  }

  function nextSpeaker() {
    socket.emit('next hand');
  }

// ###############################################################################
  

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }


  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // ############################################################################################### Socket events

  socket.on('next speaker', function (data) {
    console.log("speaker: ", data.speaking, "  direct: ", data.isDirect);
    updateSpeaker(data);
  });

  socket.on('hand update', function (data) {
    updateHands(data.replies, data.hands);
  });

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "queueCue prototype";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    console.log("new message", data);
    addChatMessage(data);
  });


  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
// });