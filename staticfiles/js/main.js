console.log("success")
var usernameInput = document.querySelector("#username")
var btnJoin = document.querySelector("#btn-join")

var username;
var webSocket;

function webSocketOnMessage(event){
    var parseData = JSON.parse(event.data);
    var message = parseData['message'];
    console.log('message: ', message)
}

btnJoin.addEventListener('click', ()=> {
    console.log("hai")
    username = usernameInput.value;

    console.log(username)

    if(username==''){
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';


    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector("#label_username")
    labelUsername.innerHTML = username;

    var loc = window.location;

    var wsStart = 'ws://';

    if(loc.protocol == 'https:'){
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname;
    console.log('endPoint: ', endPoint);

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open',(e)=>{
        console.log("Connection is open")
    });

    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e)=>{
        console.log("Connection close")
    });

    webSocket.addEventListener('error', ()=>{
        console.log("Some error is occurred")
    });

})