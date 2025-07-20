let API_URL;

(async function () {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Could not fetch server configuration.');
        const config = await response.json();
        API_URL = config.apiUrl;
        console.log(`API URL set to: ${API_URL}`);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.body.innerHTML = '<h1>Error: Could not connect to the server. Please refresh the page.</h1>';
        return;
    }

    const apiKeySection = document.getElementById('api-key-section');
    const streamingSection = document.getElementById('streaming-section');
    const joinStreamBtn = document.getElementById('join-stream-button');
    const leaveBtn = document.getElementById('leave-button');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusDiv = document.getElementById('status');
    const roomIdInput = document.getElementById('room-id');
    const apiKeyInput = document.getElementById('api-key');
    const chatSection = document.getElementById('chat-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');

    let signalRConnection;
    let peerConnection;             
    let currentRoomId;
    let livekitRoom;
    let broadcastType;
    let myUsername = `User-${Math.floor(Math.random() * 1000)}`;

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    joinStreamBtn.addEventListener('click', handleJoinStream);
    leaveBtn.addEventListener('click', handleLeave);
    chatSendButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    async function handleJoinStream() {
        currentRoomId = roomIdInput.value;
        const apiKey = apiKeyInput.value;
        if (!currentRoomId || !apiKey) {
            alert('Please enter both an API Key and a Room ID.');
            return;
        }

        switchToStreamingView();
        statusDiv.textContent = `Searching for broadcast in room: ${currentRoomId}...`;

        try {
            const response = await fetch(`${API_URL}/api/broadcast/join/${currentRoomId}`, {
                method: 'GET',
                headers: { 'X-Api-Key': apiKey }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Could not find broadcast. Check API Key or Room ID.');
            }

            const connectionDetails = await response.json();
            broadcastType = connectionDetails.broadcastType;

            if (broadcastType === 'sfu') {
                await connectToSfuStream(connectionDetails);
            } else {
                await connectToMeshStream(connectionDetails);
            }
        } catch (error) {
            console.error('Error joining stream:', error);
            statusDiv.textContent = `Error: ${error.message}`;
            apiKeySection.classList.remove('hidden');
            streamingSection.classList.add('hidden');
        }
    }

    async function handleLeave() {
        if (livekitRoom) await livekitRoom.disconnect();
        if (signalRConnection) await signalRConnection.stop();
        window.location.reload();
    }

    async function connectToSfuStream({ liveKitUrl, token }) {
        statusDiv.textContent = 'SFU broadcast found! Connecting...';
        livekitRoom = new LivekitClient.Room();

        livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === 'video' || track.kind === 'audio') {
                const element = track.attach();
                if (track.kind === 'video') {
                    remoteVideo.srcObject = element.srcObject;
                }
            }
        });

        livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant) => {
            const decoder = new TextDecoder();
            const message = JSON.parse(decoder.decode(payload));
            displayChatMessage(message.username, message.text, false);
        });

        livekitRoom.on(LivekitClient.RoomEvent.Disconnected, () => {
            alert('The broadcast has ended.');
            window.location.reload();
        });

        livekitRoom.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) => {
            if (state === 'connected') {
                statusDiv.textContent = 'Live stream connected!';
            }
        });

        await livekitRoom.connect(liveKitUrl, token);
    }

    async function connectToMeshStream(details) {
        statusDiv.textContent = 'Mesh broadcast found! Connecting...';
        signalRConnection = new signalR.HubConnectionBuilder()
            .withUrl(API_URL + details.signalRHubUrl, {
                accessTokenFactory: () => details.token
            })
            .withAutomaticReconnect()
            .build();

        signalRConnection.on('ReceiveOfferFromBroadcaster', async (offer, broadcasterId) => {
            console.log('Received offer from broadcaster');
            peerConnection = createPeerConnection(broadcasterId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await signalRConnection.invoke('SendAnswerToBroadcaster', broadcasterId, answer);
        });

        signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
            if (peerConnection) await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });

        signalRConnection.on('BroadcastEnded', () => {
            alert('The broadcast has ended.');
            window.location.reload();
        });

        signalRConnection.on('ReceiveChatMessage', (user, message) => {
            displayChatMessage(user, message, user === myUsername);
        });

        try {
            await signalRConnection.start();
            console.log('SignalR Connected for Mesh.');
            await signalRConnection.invoke('ViewBroadcast', currentRoomId);
        } catch (error) {
            console.error('SignalR Connection Error: ', error);
            statusDiv.textContent = 'Failed to connect to the streaming server.';
        }
    }

    function createPeerConnection(broadcasterId) {
        const pc = new RTCPeerConnection(iceServers);
        pc.onicecandidate = event => {
            if (event.candidate) signalRConnection.invoke('SendIceCandidate', broadcasterId, event.candidate);
        };
        pc.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') statusDiv.textContent = 'Live stream connected!';
        };
        return pc;
    }

    function sendChatMessage() {
        const text = chatInput.value;
        if (!text) return;

        if (broadcastType === 'sfu' && livekitRoom) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ username: myUsername, text }));
            livekitRoom.localParticipant.publishData(data, LivekitClient.DataPacket_Kind.RELIABLE);
            displayChatMessage(myUsername, text, true);
        } else if (broadcastType === 'mesh' && signalRConnection) {
            signalRConnection.invoke('SendChatMessage', currentRoomId, text)
                .catch(err => console.error("Chat send error:", err));
        }
        chatInput.value = '';
    }

    function displayChatMessage(user, message, isSelf) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('p-2', 'rounded-lg', 'mb-2', 'chat-message', 'max-w-xs', 'w-fit');
        msgDiv.classList.toggle('self', isSelf);
        msgDiv.classList.toggle('other', !isSelf);
        msgDiv.innerHTML = `<span class="font-bold block">${isSelf ? "You" : user}</span> ${message}`;
        chatMessages.insertBefore(msgDiv, chatMessages.firstChild);
    }

    function switchToStreamingView() {
        apiKeySection.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
    }
})();