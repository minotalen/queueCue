# QueueCue

### CREATIVE // DESIGN
* Optionen / Modi (siehe `possible options.md`)

### KNOWN BUGS

* being Pos2 in the Queue and then going to Pos1 gives sound notification for next in line
* doesn't handle reconnect (does now?)
* Safari does not handle jQuery fades (results in broken UX, does not work) 
* reconnect as speaker has speak count + 1 (edge cases are best, let's never fix themmm)

### CHANGELOG (fresh updates on top)

08.02
  * welcome to the dark mode toggle
  * developed new icons

01.02
  * quotierung implemented (still have to fix the sort loop for puffer to work)
  
17.01
  * wow, -1 is true, that's soo confusing
  * bare user raise counting
  
28.12
  * first user that logs in now becomes mod
  * toggleable log/options menu with toggle for 'removeOnLeave'
  * max length option for the queue (currently just shows ... on max length but eventually it should also tell the user their position)
  * community vote kick ? (still needs a setting, also needs to work)
  
14.12
  * added dark stuff (sorry it was necessary)
  * added highlighting of own name
  * first option 'removeOnLeave'. When _'true'_, disconnected users are removed from the queue and as speakers. When _'false'_, disconnected users can rejoin by entering their old user name
    * still need an option for automatically filling the now-empty speaker role (when on)
      
13.12
  * usernames are now **unique** and have to be longer than 2 chars
  * hopefully didnt introduce a bunch of bugs
  * rudimentary grid layout
  * username confirm button
  * own queue position highlighted
  * cant reply to self anymore, cant queue when speaking
  * actually buttons are hidden when user is speaking
  * speaker may now also trigger next (so modless is theoretically possible)
    * buttons are hidden and shown depending on state
    
12.12:  
  * added seperate display areas for speaker and replyer  
  * replyer gets cleared on new speaker
  * added favicon queue position & speaking display
  * user now gets cleared from speaking & direct on disconnect
  * added keyboard shortcuts 
    * **h** to queue up
    * **d** for direct reply
    * **n** for next if mod

