import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock, TextWrapping } from "@babylonjs/gui/2D/controls/textBlock";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { InputText } from "@babylonjs/gui/2D/controls/inputText";
import { ScrollViewer } from "@babylonjs/gui/2D/controls/scrollViewers/scrollViewer";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { PlayerMessage } from "../../../shared/types/index";
import Config from "../../../shared/Config";

export class UI_Chats {

    private _playerUI;
    private _chatUI;
    private _chatRoom;
    private _currentPlayer;
    private _entities;

    private _chatButton;
    private _chatInput;

    public messages: PlayerMessage[] = [];

    constructor(_playerUI, _chatRoom, _currentPlayer, _entities) {

        this._playerUI = _playerUI;
        this._chatRoom = _chatRoom;
        this._currentPlayer = _currentPlayer;
        this._entities = _entities;

        // create ui
        this._createUI();

        // add ui events
        this._createEvents();

        // add messages
        this._refreshChatBox();

    }

    _createUI(){
        
        // add stack panel
        const chatPanel = new Rectangle("chatPanel");
        chatPanel.top = "-10px;"
        chatPanel.height = "131px";
        chatPanel.width = "400px";
        chatPanel.thickness = 0;
        chatPanel.background = Config.UI_CENTER_PANEL_BG;
        chatPanel.alpha = 1;
        chatPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        chatPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._playerUI.addControl(chatPanel);

        // add chat input
        const chatInput = new InputText("chatInput");
        chatInput.width = .8;
        chatInput.height = '30px;'
        chatInput.top = "0px";
        chatInput.color = "#FFF";
        chatInput.placeholderText = "Write message here...";
        chatInput.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        chatInput.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        chatPanel.addControl(chatInput);
        this._chatInput = chatInput;

        // add chat send button
        const chatButton = Button.CreateSimpleButton("chatButton", "SEND");
        chatButton.width = .2;
        chatButton.height = '30px;'
        chatButton.top = "0px";
        chatButton.color = "#FFF";
        chatButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        chatButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        chatPanel.addControl(chatButton);
        this._chatButton = chatButton;

        // add scrollable container
        const chatScrollViewer = new ScrollViewer("chatScrollViewer");
        chatScrollViewer.width = 1;
        chatScrollViewer.height = "100px";
        chatScrollViewer.top = "-30px";
        chatScrollViewer.background = Config.UI_CENTER_PANEL_BG;
        chatScrollViewer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        chatScrollViewer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        chatPanel.addControl(chatScrollViewer);

        // add stack panel
        const chatStackPanel = new StackPanel("chatStackPanel");
        chatStackPanel.width = "100%";
        chatStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        chatStackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        chatStackPanel.paddingTop = "5px;"
        chatScrollViewer.addControl(chatStackPanel);
        this._chatUI = chatStackPanel;

        // focus chat
        chatInput.focus();

        // add default chat message
        this.messages.push({
            senderID: "SYSTEM",
            message: "Welcome to T5C, you can move around by left clicking and dragging the mouse around. Use ability by selecting a target an then typing the appropriate digits on the keyboard.",
            name: "SYSTEM",
            timestamp: 0,
            createdAt: ""
        }); 

        // intial refresh chatbox
        this._refreshChatBox();

    }

    _createEvents(){
        
        // on click send
        this._chatButton.onPointerDownObservable.add(() => { 
            this.sendMessage();
        });

        // chatbox on enter event
        this._chatInput.onKeyboardEventProcessedObservable.add((ev) => { 
            if((ev.key==="Enter" || ev.code==="Enter") && this._chatInput.text != ""){
                this.sendMessage();
            }
        });

        // receive message event
        this._chatRoom.onMessage("messages", (message:PlayerMessage) => {
            this.processMessage(message);
        });

    }

    // set current player
    public setCurrentPlayer(currentPlayer){
        this._currentPlayer = currentPlayer;
    }

    // process incoming messages
    public processMessage(message){
        this.messages.push(message); 
        this._refreshChatBox();
        this.showChatMessage(message);
    }

    // show chat message above player
    public showChatMessage(msg:PlayerMessage){
        let player = this._entities[msg.senderID];
        if(msg.senderID === this._currentPlayer.sessionId){
            player = this._currentPlayer;
        }
        clearInterval(player.showTimer);
        if(player && player.characterLabel){
            let el = player.characterLabel;
            player.characterChatLabel.isVisible = true;
            player.characterChatLabel._children[0].text = msg.message;
            player.showTimer = setTimeout(function(){ player.characterChatLabel.isVisible = false; }, 20000);
        }
        
    }

    // send message to server
    private sendMessage(){
        this._chatRoom.send("message", {
            name: this._currentPlayer.name,
            message: this._chatInput.text
        });
        this._chatInput.text = "";
        this._chatInput.focus();
        this._refreshChatBox();
    }

    // chat refresh
    public addChatMessage(msg:PlayerMessage){
        this.messages.push(msg);
        this._refreshChatBox();
    }

    // chat refresh
    private _refreshChatBox(){

        // remove all chat and refresh
        let elements = this._chatUI.getDescendants();
        elements.forEach(element => {
            element.dispose();
        });

        this.messages.slice().reverse().forEach((msg:PlayerMessage) => {

            // container
            var headlineRect = new Rectangle("chatMsgRect_"+msg.createdAt);
            headlineRect.width = "100%";
            headlineRect.thickness = 0;
            headlineRect.paddingBottom = "5px";
            headlineRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            headlineRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            headlineRect.adaptHeightToChildren = true;
            this._chatUI.addControl(headlineRect);

            let prefix = '[GLOBAL] '+msg.name+': ';
            if(this._currentPlayer){
                prefix = msg.senderID == this._currentPlayer.sessionId ? 'You said: ' : '[GLOBAL] '+msg.name+': ';
            }
            
            // message
            var roomTxt = new TextBlock("chatMsgTxt_"+msg.createdAt);
            roomTxt.paddingLeft = "5px";
            roomTxt.text = prefix+msg.message;
            roomTxt.textHorizontalAlignment = 0;
            roomTxt.fontSize = "12px";
            roomTxt.color = "#FFF";
            roomTxt.left = "0px";
            roomTxt.textWrapping = TextWrapping.WordWrap;
            roomTxt.resizeToFit = true;
            roomTxt.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            roomTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            headlineRect.addControl(roomTxt);

        });
        
    }

}