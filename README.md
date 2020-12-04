# QueueCue

### KREATIV // DESIGN
* Optionen / Modi erfinden (siehe `possible options.md`)
### KNOWN BUGS

* being Pos2 in the Queue and then going to Pos1 gives sound notification for next in line
* doesn't handle reconnect
* Safari does not handle jQuery fades (results in broken UX, does not work) 

### CHANGELOG (fresh updates on top)

  14.02
  * added dark stuff (sorry it was necessary)
  * added highlighting of own name
  * first option "removeOnLeave". When _'true'_, disconnected users are removed from the queue and as speakers. When _'false'_, disconnected users can rejoin by entering their old user name
    * still need an option for automatically filling the now-empty speaker role (when on)
      
13.02
  * usernames are now **unique** and have to be longer than 2 chars
  * hopefully didnt introduce a bunch of bugs
  * rudimentary grid layout
  * username confirm button
  * own queue position highlighted
  * cant reply to self anymore, cant queue when speaking
  * actually buttons are hidden when user is speaking
  * speaker may now also trigger next (so modless is theoretically possible)
    * buttons are hidden and shown depending on state
    
12.02:  
  * added seperate display areas for speaker and replyer  
  * replyer gets cleared on new speaker
  * added favicon queue position & speaking display
  * user now gets cleared from speaking & direct on disconnect
  * added keyboard shortcuts 
    * **h** to queue up
    * **d** for direct reply
    * **n** for next if mod

