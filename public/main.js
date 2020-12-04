/* global io */

// IFFY  immediately invoked function expression  --- limits scope 
// (function () {

  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#c27513', '#f8a700', '#f78b00',
    '#58dc00', '#8cde87', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#5677d1', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $eventlog = $('.eventlog'); // event log area
  var $error = $('.error'); // Login Error area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $modArea = $('.modArea');  // hands display box
  var $hands = $('.handsArea');  // hands display box
  var $speaker = $('.speakerArea');  // hands display box
  var $reply = $('.replyArea');  // hands display box


  var $button = $('.button');
  var $buttons = $('.buttonArea');
  var $raiseHand = $('.raiseHand');
  var $directHand = $('.directHand');
  var $nextButton = $('.nextButton');
  var $logButton = $('.logButton');
  var $removeOption = $('.removeOption')
  var $clearOption = $('.clearOption')
  

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page



  // Prompt for setting a username
  var username;
  var isMod = false;
  var connected = false;
  var typing = false;
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
    removeOnDisconnect: true,
    maxQueueDisplay: 10
  };

  var favicon=new Favico({
    type : 'rectangle',
    animation:'slide',
    bgColor: '#DA81F5',
    textColor:'#000'
  });


  // ################# KEYBOARD ###################################################

  $window.keydown(function(event) {
    if($chatPage.is(':visible')){
      if(event.key == "h" && username) raiseHand();  
      if(event.key == "d" && username) directHand();  
      // if(event.key == "m") makeMeMod();  
      
      if(event.key == "n" && ( isMod || speaker == username) ) nextSpeaker();  
      if(event.key == "l" && ( isMod ) ) {
        console.log("toggling log", $modArea.is(":visible"));
        toggleLog();  
      }
    }
  });
    
  // ############# MOD AND OPTIONS     ##################################################
  function makeMeMod () {
    if(!isMod){
      isMod = true;
      console.log("You are now a moderator...");
      // $raiseHand.fadeOut();
      // $directHand.fadeOut();
      $buttons.css('grid-template-rows', '1fr 1fr');
      $nextButton.show();
      $logButton.show();
    }
    
  }
  

  function toggleLog() {
        if($modArea.is(":visible")) {
          $logButton.removeClass("active");
          $modArea.fadeOut();
          
          $removeOption.hide();
          $clearOption.hide();
          
          $raiseHand.fadeIn();
          $directHand.fadeIn();
        } else {
          $logButton.addClass("active");
          $modArea.show();
          
          if(options.removeOnDisconnect == true) {
            $removeOption.addClass("active");
          } else {
            $removeOption.removeClass("active");
          }
          $raiseHand.hide()
          $directHand.hide()
          
          $removeOption.fadeIn()
          $clearOption.fadeIn()
          

        }

  }
  // OPTIONS ##########################################

  function optionRemoveOnLeave(input) {
    if(input== true) {
      $removeOption.addClass("active");
    } else {
      $removeOption.removeClass("active");
    }
    options.removeOnDisconnect = input;
    socket.emit('options', {removeOnLeave: input});
  }  

  function clear(clrDirect = true, clrHands = true) {
    console.log("clearing queue");
    if(clrDirect && isMod) {
      socket.emit('clear direct');
    };
    if(clrHands && isMod) {
      socket.emit('clear hands');
    };
    if( (clrHands || clrDirect) && isMod ) {
      socket.emit('new message', "has cleared the queue");
    }
  }


  // NOTIFICATIONS & TITLE ##################################################################
  
  // finds the user position in the combined queue
  function findPosInQueue(name, replyArray, handsArray) {
    let pos = 0;
    let fullArray = replyArray.concat(handsArray);  // joins the two arrays
    // console.log(fullArray, name);
    if(fullArray.length == 0) return 998; // nobody in the queue
    for(let i = 0; i < fullArray.length; i++) {
      if(fullArray[i] == name){
        pos = i // position in the queue (starting at 0 for first)
        break;
      }
      pos = 999; // name not in queue
    }
    // console.log("queue position: ", pos);
    return pos;
  }

  // sets the text of the title based on queue position
  function titleText(pos) {
    let speakUp = "! Your turn to speak !";
    let firstPos = ". You're up next! .";
    let notQueued = "Not in the queue.";
    let emptyQueue = "Queue is empty"
    if(pos == 0) {
      document.title = firstPos;      
    } else if(pos == 999) {
      document.title = notQueued;      
    } else if(pos == 998) {
      document.title = emptyQueue; 
    } else {
      document.title = `Position ${pos+1} in the queue.`
    }
    
    if(speaker == username || replyer == username ) {
      document.title = speakUp;
      favicon.badge("!!!");
      return;
    }
    console.log("position in queue: ", pos, "   previous position: ", currentPos);
    // NOTIFICATION SOUNDS
    if(currentPos == 1 && pos == 0) nextSound.play();
    
    
    if(pos < 10 && pos != currentPos) {
      favicon.badge(pos+1);
    }
    if(pos == 998 || pos == 999) favicon.badge(0);
    currentPos = pos;
  }

  // ################# AUDIO    ###################################################
  var nextSound, speakSound;
  $(document).ready(function() {
    nextSound = document.createElement('audio');
    nextSound.setAttribute('src', 'https://cdn.glitch.com/19a8c08b-3360-4881-8fc4-9fc8748478ce%2Fsharp-592.mp3?v=1606959394544');
    
    speakSound = document.createElement('audio');
    speakSound.setAttribute('src', 'https://cdn.glitch.com/19a8c08b-3360-4881-8fc4-9fc8748478ce%2Fjust-saying-593.mp3?v=1606959395695'); 
  });
 
  
  // ################# BUTTONS    ###################################################
  
  // raise or lower user hand, add/remove from queue
  function raiseHand () {
    console.log("hand raise clicked", handRaised)
    if(speaker != username) {
      if(!handRaised) {
        // tell server to raise user hand
        socket.emit('raise hand');
        console.log("raising hand");
        handRaised = true;
        $raiseHand.addClass("active");
      } else {
        socket.emit('lower hand');
        console.log("hand lowered");
        handRaised = false;
        $raiseHand.removeClass("active");
      }
    }
  }

  function directHand () {
    console.log("direct reply clicked", directRaised)
    if(speaker != username) {
      if(!directRaised) {
        // tell server to raise user hand
        socket.emit('raise reply');
        console.log("instant reply");
        directRaised = true;
        $directHand.addClass("active");
      } else {
        socket.emit('lower reply');
        console.log("instant reply");
        directRaised = false;
        $directHand.removeClass("active");
      }
    }
  }



  // ################# SOCKET RECEIVE ######################################
  function updateHands (replyArray, handsArray) {
    $hands.empty();
    // console.log(handsArray);
      $hands.append('<h3> Hands: </h3>');
    // if(replyArray >= 1) $hands.append('<h4> Replies </h4>');
    
    let ownBuffer = 0; // all own add +1 element because of the span
    // draw all replies
    for(let i = 0; i < replyArray.length; i++) {
      if(cleanInput(replyArray[i]) == username) {
        $hands.append("<div class='replyHand'> <span class='ownHand'> 🙌 " + cleanInput(replyArray[i])) + "</span></div>";
        ownBuffer++;
        // on reconnect, add class again
        console.log("instant reply");
        directRaised = true;
        $directHand.addClass("active");
      } else {
        $hands.append("<div class='replyHand'> 🙌 " + cleanInput(replyArray[i])) + "</div>";
      }
      var matched = $(".handsArea *");
      if(matched.length > options.maxQueueDisplay + ownBuffer + 2) { // +2 because of hr & h3
        $hands.append("<div class='moreInQueue'> ... </div>");
        return;
      }
    }
    
    // horizontal line betwen direct and replies
    if(replyArray.length != 0 && handsArray.length != 0)  $hands.append("<hr>"); 

    // draw all raised hands
    for(let i = 0; i < handsArray.length; i++) {
      if(cleanInput(handsArray[i]) == username) {
        $hands.append("<div class='singleHand'><span class='ownHand'> ✋ " + cleanInput(handsArray[i])) + "</span></div>";
        console.log("raising hand");
        ownBuffer++;
        // on reconnect, add class again
        handRaised = true;
        $raiseHand.addClass("active");
      } else {
        $hands.append("<div class='singleHand'> ✋ " + cleanInput(handsArray[i])) + "</div>";
      }
      var matched = $(".handsArea *");
      if(matched.length > options.maxQueueDisplay + ownBuffer + 2) { // +2 because of hr & h3
        $hands.append("<div class='moreInQueue'> ... </div>");
        return;
      }
    }
    
    //update text for title bar
    titleText(findPosInQueue(username, replyArray, handsArray));
  }

  function updateSpeaker (data) {
    // TODO: if clause to filter twice in a row and self-reply
    if(data.isDirect && data.speaking == username){
      // speaking direct now
      console.log("speaking direct now");
      speakSound.play();
      directRaised = false;  
      $directHand.removeClass("active");
      if(!isMod) {
        $nextButton.fadeOut();
      }
      $raiseHand.fadeIn();
      $directHand.fadeOut();
    } else if (!data.isDirect && data.speaking == username){
      // speaking regular now
      console.log("speaking regular now");
      speakSound.play();
      handRaised = false;
      $raiseHand.removeClass("active");
      
      if(!isMod) {
        $nextButton.fadeIn();
        $nextButton.css('grid-column', '1/3');
        $nextButton.css('grid-row', '1/3');
      }

      $raiseHand.fadeOut();
      $directHand.fadeOut();
    }
    
    // console.log("speaker: ", speaker, " username: ", username, "mod", isMod);    
    
    if(data.isDirect){
        //clear replyer div
        $reply.empty();
        replyer = data.speaking;
        if(data.speaking == "") return;
        // console.log("updating replyer: ", replyer);
        if(replyer == username) {
          $reply.append("<p> 🙌 Reply: <br> <span class='ownHand'>" + replyer + "</p>");
        } else {
          $reply.append('<p> 🙌 Reply: <br>' + replyer + '</p>');
        }
    } else {
        speaker = data.speaking;
        // console.log("updating speaker: ", speaker);
        //clear speaker and replyer divs
        $reply.empty();
        replyer = ""
        $speaker.empty();
        if(data.speaking == "") return;
        if(speaker == username) {
          $speaker.append("<p> Speaker: <br> <span class='ownHand'>" + speaker + "</span></p>");
        } else {
          $speaker.append('<p> Speaker: <br>' + speaker + '</p>');
        }
      

    }
    
    if (!isMod && speaker != username && replyer != username) {
      // not speaking (anymore)
      console.log("not speaking (anymore)");
      $nextButton.css('grid-column', '1');
      $nextButton.fadeOut();
      
      $raiseHand.fadeIn();
      $directHand.fadeIn();
    } else if (isMod && speaker != username && replyer != username) {
      $raiseHand.fadeIn();
      $directHand.fadeIn();
    }
  }


  // ################# SOCKET SEND ######################################
  function nextSpeaker() {
    if(username == speaker || isMod) {
      socket.emit('next hand');
    } else {
      console.log("not speaker or mod", speaker, username, isMod);
    }
  }

// ###############################################################################
  

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant, you :)";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());
    if (username.length < 3) {
      $error.empty();
      $error.append("Please use a name longer than 2 characters.");
      username = false;
      return;
    }
    
    // If the username is valid
    if (username) {
      // Tell the server your username
      socket.emit('add user', username);
      // verifyUsername();
    }
  }
  
  // username is unique
  function verifyUsername () {
      if(username == "mod") makeMeMod();
      $loginPage.fadeOut();
      $loginPage.off('click');
      $chatPage.show();
      $modArea.hide();
      $currentInput = $inputMessage.focus();
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
      $eventlog.prepend($el);
    } else {
      $eventlog.append($el);
    }
    $eventlog[0].scrollTop = $eventlog[0].scrollHeight;
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
        console.log("trying to set username...");
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
    console.log("dat:", data);
    console.log("speaker: ", data.speaking, "  direct: ", data.isDirect);
    updateSpeaker(data);
  });

  socket.on('hand update', function (data) {
    updateHands(data.replies, data.hands);
  });

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // makes the first user a mod
    if(data.makeMod) makeMeMod();
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

  socket.on('valid name', function () {
    verifyUsername();
  });

  socket.on('invalid name', function (data) {
    username = false;
    $error.empty();
    if(data == "inUse") $error.append("This name is already in use");
    if(data == "userOnline") $error.append("welp, this sucks");
  });  
  
// })();