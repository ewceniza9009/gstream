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
    const usernameInput = document.getElementById('username');
    const chatSection = document.getElementById('chat-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const qualityControls = document.getElementById('quality-controls');
    const viewerCountNumber = document.getElementById('viewer-count-number');


    let signalRConnection;
    let peerConnection;
    let currentRoomId;
    let livekitRoom;
    let broadcastType;
    let myUsername;
    let jwtToken = null;                     

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
        const username = usernameInput.value;

        if (!currentRoomId || !apiKey || !username) {
            alert('Please enter a Display Name, API Key, and Room ID.');
            return;
        }

        switchToStreamingView();
        statusDiv.textContent = `Searching for broadcast in room: ${currentRoomId}...`;

        try {
            const response = await fetch(`${API_URL}/api/broadcast/join/${currentRoomId}`, {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Could not find broadcast. Check API Key or Room ID.');
            }

            const connectionDetails = await response.json();
            broadcastType = connectionDetails.broadcastType;
            myUsername = connectionDetails.username || username;

            if (broadcastType === 'sfu') {
                await connectToSfuStream(connectionDetails);
            } else {
                await connectToMeshStream(connectionDetails);
            }
            await fetchAndRenderChatHistory(currentRoomId);
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

        livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant, kind, topic) => {
            console.log('--- CONSUMER: LiveKit Data Received ---', { topic, from: participant.identity });
            try {
                const messageDto = JSON.parse(new TextDecoder().decode(payload));
                if (topic === 'chat') {
                    displayChatMessage(messageDto.id, messageDto.username, messageDto.content, messageDto.username === myUsername);
                } else if (topic === 'moderation' && messageDto.action === 'delete') {
                    const msgElement = document.getElementById(`chat-msg-${messageDto.id}`);
                    if (msgElement) msgElement.remove();
                }
            } catch (e) {
                console.error("Failed to parse incoming data payload:", e);
            }
        });

        livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            qualityControls.innerHTML = '';
            if (track.kind === 'video') {
                const element = track.attach();
                remoteVideo.srcObject = element.srcObject;
            } else if (track.kind === 'audio') {
                const element = track.attach();
                remoteVideo.appendChild(element);
            }
        });

        livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, () => {
            viewerCountNumber.textContent = livekitRoom.numParticipants;
        });
        livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => {
            viewerCountNumber.textContent = livekitRoom.numParticipants;
        });

        livekitRoom.on(LivekitClient.RoomEvent.Disconnected, () => {
            alert('The broadcast has ended.');
            window.location.reload();
        });

        livekitRoom.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) => {
            if (state === 'connected') {
                statusDiv.textContent = 'Live stream connected!';
                viewerCountNumber.textContent = livekitRoom.numParticipants;
            }
        });

        await livekitRoom.connect(liveKitUrl, token);
        console.log('--- CONSUMER: Connected to LiveKit Room ---');
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

        signalRConnection.on('ReceiveChatMessage', (messageId, user, message) => {
            displayChatMessage(messageId, user, message, user === myUsername);
        });

        signalRConnection.on('UpdateViewerCount', (count) => {
            viewerCountNumber.textContent = count;
        });

        signalRConnection.on('MessageDeleted', (messageId) => {
            const msgElement = document.getElementById(`chat-msg-${messageId}`);
            if (msgElement) msgElement.remove();
        });

        try {
            await signalRConnection.start();
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

    async function sendChatMessage() {
        const text = chatInput.value;
        if (!text) return;
        chatInput.value = '';

        if (broadcastType === 'mesh' && signalRConnection) {
            signalRConnection.invoke('SendChatMessage', currentRoomId, text)
                .catch(err => console.error("Chat send error:", err));
            return;
        }

        if (broadcastType === 'sfu' && livekitRoom) {
            const messageId = Date.now();
            const payload = { id: messageId, username: myUsername, content: text, timestamp: new Date().toISOString() };
            const data = new TextEncoder().encode(JSON.stringify(payload));

            console.log('--- CONSUMER: Publishing Chat Data ---', payload);

            livekitRoom.localParticipant.publishData(data, { reliable: true, topic: 'chat' });

            displayChatMessage(payload.id, payload.username, payload.content, true);
        }
    }

    async function fetchAndRenderChatHistory(roomId) {
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
            console.error("API Key not found, cannot fetch chat history.");
            return;
        }
        chatMessages.innerHTML = '';
        try {
            const response = await fetch(`${API_URL}/api/rooms/${roomId}/chat`, {
                headers: { 'X-Api-Key': apiKey }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch chat history with status: ${response.status}`);
            }
            const history = await response.json();
            history.forEach(msg => displayChatMessage(msg.id, msg.username, msg.content, msg.username === myUsername));
        } catch (e) {
            console.error("Could not fetch chat history", e);
        }
    }

    function displayChatMessage(id, user, message, isSelf) {
        const msgContainer = document.createElement('div');
        msgContainer.id = `chat-msg-${id}`;
        msgContainer.className = `chat-message flex items-start gap-2.5 p-2 w-full ${isSelf ? 'self' : 'other'}`;

        const avatar = createAvatar(user);

        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'flex flex-col w-full max-w-[320px]';

        const header = document.createElement('div');
        header.className = 'flex items-center space-x-2' + (isSelf ? ' justify-end flex-row-reverse' : '');

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'text-sm font-semibold text-white';
        usernameSpan.textContent = isSelf ? "You" : user;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble flex flex-col w-full max-w-xs p-2.5 rounded-lg' + (isSelf ? ' rounded-br-none bg-blue-700' : ' rounded-bl-none bg-gray-600');
        bubble.innerHTML = `<p class="text-sm font-normal text-white break-words">${message}</p>`;

        header.appendChild(usernameSpan);
        bubbleContainer.appendChild(header);
        bubbleContainer.appendChild(bubble);

        if (isSelf) {
            msgContainer.appendChild(bubbleContainer);
            msgContainer.appendChild(avatar);
        } else {
            msgContainer.appendChild(avatar);
            msgContainer.appendChild(bubbleContainer);
        }

        chatMessages.insertBefore(msgContainer, chatMessages.firstChild);
    }

    function createAvatar(username) {
        const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
        const charCodeSum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = colors[charCodeSum % colors.length];
        const initials = username.length > 1 ? (username[0] + username[1]).toUpperCase() : username.toUpperCase();

        const avatarDiv = document.createElement('div');
        avatarDiv.className = `relative inline-flex items-center justify-center w-8 h-8 overflow-hidden rounded-full ${color} flex-shrink-0`;
        avatarDiv.innerHTML = `<span class="font-medium text-white">${initials}</span>`;
        return avatarDiv;
    }

    function switchToStreamingView() {
        apiKeySection.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
    }
})();