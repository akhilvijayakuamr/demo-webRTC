var mapPeers = {};
var usernameInput = document.querySelector("#username");
var btnJoin = document.querySelector("#btn-join");

var username;
var webSocket;

function webSocketOnMessage(event) {
    var parseData = JSON.parse(event.data);
    var peerUsername = parseData['peer'];
    var action = parseData['action'];

    console.log(action);

    if (username == peerUsername) {
        console.log("Ignoring self message");
        return;
    }

    var receiver_channel_name = parseData['message']['receive_channel_name'];

    if (action === 'new-peer') {
        console.log("New peer detected");
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }

    if (action === 'new-offer') {
        var offer = parseData['message']['sdp'];
        createAnswer(offer, peerUsername, receiver_channel_name);
    }

    if (action === 'new-answer') {
        var answer = parseData['message']['sdp'];
        var peer = mapPeers[peerUsername][0];
        peer.setRemoteDescription(new RTCSessionDescription(answer));
        return;
    }
}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    if (username === '') return;

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';
    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector("#label_username");
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = loc.protocol === 'https:' ? 'wss://' : 'ws://';
    var endPoint = wsStart + loc.host + loc.pathname;
    console.log('WebSocket Endpoint: ', endPoint);

    webSocket = new WebSocket(endPoint);
    webSocket.addEventListener('open', (e) => {
        console.log("Connection opened");
        sendSignal('new-peer', {});
    });
    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', () => console.log("Connection closed"));
    webSocket.addEventListener('error', () => console.log("An error occurred"));
});

var localStream = new MediaStream();
const constraints = { video: true, audio: true };

const localVideo = document.querySelector('#local-video');
const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');

navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;
            btnToggleAudio.innerHTML = audioTracks[0].enabled ? 'Audio Mute' : 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;
            btnToggleVideo.innerHTML = videoTracks[0].enabled ? 'Video Mute' : 'Video Unmute';
        });
    })
    .catch(error => console.error('Error accessing media devices', error));

function sendSignal(action, message) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message
    });
    webSocket.send(jsonStr);
}

function createOfferer(peerUsername, receive_channel_name) {
    var peer = new RTCPeerConnection();
    addLocalTracks(peer);
    var dc = peer.createDataChannel('channel');

    dc.addEventListener('open', () => console.log("Data channel opened"));
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        if (['failed', 'disconnected', 'closed'].includes(peer.iceConnectionState)) {
            delete mapPeers[peerUsername];
            if (peer.iceConnectionState !== 'closed') peer.close();
            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (!event.candidate) {
            sendSignal('new-offer', {
                'sdp': peer.localDescription,
                'receive_channel_name': receive_channel_name
            });
        }
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => console.log("Offer created and set as local description"));
}

function createAnswer(offer, peerUsername, receive_channel_name) {
    var peer = new RTCPeerConnection();
    addLocalTracks(peer);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => console.log("Data channel opened"));
        peer.dc.addEventListener('message', dcOnMessage);
        mapPeers[peerUsername] = [peer, peer.dc];
    });

    peer.addEventListener('iceconnectionstatechange', () => {
        if (['failed', 'disconnected', 'closed'].includes(peer.iceConnectionState)) {
            delete mapPeers[peerUsername];
            if (peer.iceConnectionState !== 'closed') peer.close();
            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (!event.candidate) {
            sendSignal('new-answer', {
                'sdp': peer.localDescription,
                'receive_channel_name': receive_channel_name
            });
        }
    });

    peer.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peer.createAnswer())
        .then(answer => peer.setLocalDescription(answer))
        .then(() => console.log("Answer created and set as local description"));
}

function addLocalTracks(peer) {
    localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
    });
}

function dcOnMessage(event) {
    var message = event.data;
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    document.querySelector('#message-list').appendChild(li);
}

function createVideo(peerUsername) {
    var videoContainer = document.querySelector('#video-container');
    var remoteVideo = document.createElement('video');
    remoteVideo.id = `${peerUsername}-video`;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');
    videoWrapper.appendChild(remoteVideo);
    videoContainer.appendChild(videoWrapper);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', (event) => remoteStream.addTrack(event.track, remoteStream));
}

function removeVideo(video) {
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(videoWrapper);
}
