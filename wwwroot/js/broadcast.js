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

    const loginSection = document.getElementById('login-section');
    const roleSection = document.getElementById('role-section');
    const streamingSection = document.getElementById('streaming-section');
    const loginButton = document.getElementById('login-button');
    const startBroadcastBtn = document.getElementById('start-broadcast-button');
    const viewBroadcastBtn = document.getElementById('view-broadcast-button');
    const leaveBtn = document.getElementById('leave-button');
    const logoutButtonRole = document.getElementById('logout-button-role');
    const logoutButtonStreaming = document.getElementById('logout-button-streaming');
    const localVideoContainer = document.getElementById('local-video-container');
    const remoteVideoContainer = document.getElementById('remote-video-container');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusDiv = document.getElementById('status');
    const roomIdInput = document.getElementById('room-id');
    const cameraSourceRadios = document.querySelectorAll('input[name="cameraSource"]');
    const ipCameraSection = document.getElementById('ip-camera-section');
    const ipCameraUrlInput = document.getElementById('ip-camera-url');
    const flushBroadcastsBtn = document.getElementById('flush-broadcasts-button');
    const chatSection = document.getElementById('chat-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const recordBtn = document.getElementById('record-button');

    let jwtToken;
    let signalRConnection;
    let localStream;
    let peerConnections = {};
    let currentRoomId;
    let userRole;
    let livekitRoom;
    let broadcastType;
    let myUsername;

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    initializeApplicationState();

    loginButton.addEventListener('click', handleLogin);
    startBroadcastBtn.addEventListener('click', startBroadcast);
    viewBroadcastBtn.addEventListener('click', viewBroadcast);
    leaveBtn.addEventListener('click', handleLeave);
    logoutButtonRole.addEventListener('click', handleLogout);
    logoutButtonStreaming.addEventListener('click', handleLogout);
    flushBroadcastsBtn.addEventListener('click', handleFlushBroadcasts);
    chatSendButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    cameraSourceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            ipCameraSection.classList.toggle('hidden', document.querySelector('input[name="cameraSource"]:checked').value !== 'ip');
        });
    });
    recordBtn.addEventListener('click', async () => {
        if (!currentRoomId) {
            alert("You must start a broadcast before you can record.");
            return;
        }
        if (!confirm("Are you sure you want to start recording this broadcast?")) return;
        try {
            const response = await fetch(`${API_URL}/api/broadcast/record/start/${currentRoomId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to start recording.');
            alert(result.message);
            recordBtn.disabled = true;
            recordBtn.textContent = 'Recording...';
        } catch (error) {
            console.error('Recording error:', error);
            alert(`Could not start recording: ${error.message}`);
        }
    });

    async function handleLogin() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const username = usernameInput.value;
        const password = passwordInput.value;
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username: username, Password: password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = errorData.message || 'Invalid credentials';
                if (errorData.errors) {
                    errorMessage = Object.values(errorData.errors).flat().join('; ') || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            jwtToken = data.token;
            myUsername = username;

            localStorage.setItem('jwtToken', jwtToken);
            localStorage.setItem('myUsername', myUsername);

            passwordInput.value = '';

            loginSection.classList.add('hidden');
            roleSection.classList.remove('hidden');

        } catch (error) {
            loginError.textContent = `Login failed: ${error.message}`;
            console.error('Login failed:', error);
        }
    }

    function initializeApplicationState() {
        const storedToken = localStorage.getItem('jwtToken');
        const storedUsername = localStorage.getItem('myUsername');

        if (storedToken && storedUsername) {
            jwtToken = storedToken;
            myUsername = storedUsername;
            loginSection.classList.add('hidden');
            roleSection.classList.remove('hidden');
            console.log(`Restored login for: ${myUsername}`);
        } else {
            loginSection.classList.remove('hidden');
            roleSection.classList.add('hidden');
        }
    }

    async function handleLeave() {
        if (userRole === 'broadcaster' && broadcastType === 'sfu' && currentRoomId) {
            console.log('Gracefully ending SFU broadcast on the server...');
            try {
                const response = await fetch(`${API_URL}/api/broadcast/end/sfu/${currentRoomId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                if (response.ok) {
                    console.log('Server confirmed SFU broadcast ended.');
                } else {
                    const errText = await response.text();
                    console.error('Server failed to end SFU broadcast:', errText);
                }
            } catch (error) {
                console.error('Error sending end signal for SFU broadcast:', error);
            }
        }

        if (livekitRoom) {
            console.log('Disconnecting from LiveKit room...');
            await livekitRoom.disconnect();
            livekitRoom = null;
        }
        if (signalRConnection) {
            console.log('Stopping SignalR connection...');
            await signalRConnection.stop();
            signalRConnection = null;
        }
        switchToRoleSelection();
        statusDiv.textContent = '';
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
            localVideo.srcObject = null;
        }
        remoteVideo.srcObject = null;
        for (const peerId in peerConnections) {
            if (peerConnections[peerId]) {
                peerConnections[peerId].close();
            }
        }
        peerConnections = {};

        console.log('Left broadcast. Returning to role selection.');
    }

    async function handleLogout() {
        await handleLeave();

        localStorage.removeItem('jwtToken');
        localStorage.removeItem('myUsername');
        jwtToken = null;
        myUsername = null;

        loginSection.classList.remove('hidden');
        roleSection.classList.add('hidden');
        streamingSection.classList.add('hidden');
        console.log('User logged out. Redirected to login screen.');
    }


    async function startBroadcast() {
        userRole = 'broadcaster';
        currentRoomId = roomIdInput.value;
        broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;
        if (!currentRoomId) {
            alert('Please enter a Room ID.');
            return;
        }

        try {
            localStream = await getCameraStream();
            localVideo.srcObject = localStream;
            switchToStreamingView();
            if (broadcastType === 'sfu') {
                await startSfuBroadcast();
            } else {
                await startMeshBroadcast();
            }
        } catch (error) {
            console.error('Could not start broadcast.', error);
            alert(error.message || 'An unknown error occurred while starting the broadcast.');
            handleLeave();
        }
    }

    async function viewBroadcast() {
        userRole = 'viewer';
        currentRoomId = roomIdInput.value;
        if (!currentRoomId) {
            alert('Please enter a Room ID to view.');
            return;
        }
        alert("Viewing is handled on the consumer page. This is for local mesh testing only.");
        if (!await initializeSignalR()) {
            alert('Failed to connect to server.');
            return;
        }
        switchToStreamingView();
        await signalRConnection.invoke('ViewBroadcast', currentRoomId);
        statusDiv.textContent = `Attempting to view broadcast in room: ${currentRoomId}`;
    }

    async function startMeshBroadcast() {
        if (!await initializeSignalR()) {
            throw new Error('Failed to connect to server for mesh broadcast.');
        }
        await signalRConnection.invoke('StartBroadcast', currentRoomId, 'mesh');
        statusDiv.textContent = `Waiting for viewers in room (Mesh Mode): ${currentRoomId}`;
    }

    async function startSfuBroadcast() {
        statusDiv.textContent = 'Initializing SFU broadcast...';
        try {
            const response = await fetch(`${API_URL}/api/broadcast/start/sfu/${currentRoomId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to initialize SFU broadcast.');
            }
            const { liveKitUrl, token, username } = await response.json();
            myUsername = username;

            livekitRoom = new LivekitClient.Room();
            await livekitRoom.connect(liveKitUrl, token);
            statusDiv.textContent = `Broadcasting live to room: ${currentRoomId} (SFU)`;

            if (localStream.getVideoTracks().length > 0) {
                const videoTrack = localStream.getVideoTracks()[0];
                await livekitRoom.localParticipant.publishTrack(videoTrack, {
                    simulcast: true,
                    videoCodec: 'vp8'
                });
            }
            if (localStream.getAudioTracks().length > 0) {
                await livekitRoom.localParticipant.publishTrack(localStream.getAudioTracks()[0]);
            }

            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant) => {
                const decoder = new TextDecoder();
                const message = JSON.parse(decoder.decode(payload));
                displayChatMessage(message.username, message.text, false);
            });

        } catch (error) {
            console.error('SFU broadcast failed:', error);
            throw error;
        }
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
            signalRConnection.invoke('SendChatMessage', currentRoomId, text);
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

    async function initializeSignalR() {
        signalRConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/broadcasthub?access_token=${jwtToken}`)
            .withAutomaticReconnect()
            .build();

        signalRConnection.on('NewViewer', async (viewerId) => {
            statusDiv.textContent = `New viewer joined. Setting up connection...`;
            const pc = createPeerConnection(viewerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await signalRConnection.invoke('SendOfferToViewer', viewerId, offer);
        });

        signalRConnection.on('ReceiveAnswerFromViewer', async (answer, viewerId) => {
            const pc = peerConnections[viewerId];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        signalRConnection.on('ReceiveChatMessage', (user, message) => {
            displayChatMessage(user, message, user === myUsername);
        });

        signalRConnection.on('ViewerLeft', (viewerId) => {
            if (peerConnections[viewerId]) {
                peerConnections[viewerId].close();
                delete peerConnections[viewerId];
            }
        });

        signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
            const pc = Object.values(peerConnections)[0];
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        signalRConnection.on('BroadcastEnded', () => {
            alert('The broadcast has ended.');
            handleLeave();
        });

        signalRConnection.on('BroadcastExists', () => {
            alert('Error: A broadcast is already active in this room.');
            switchToRoleSelection();
        });

        try {
            await signalRConnection.start();
            console.log('SignalR Connected for Mesh.');
            return true;
        } catch (error) {
            console.error('SignalR Connection Error: ', error);
            return false;
        }
    }

    function createPeerConnection(peerId) {
        const pc = new RTCPeerConnection(iceServers);
        peerConnections[peerId] = pc;
        pc.onicecandidate = event => {
            if (event.candidate) signalRConnection.invoke('SendIceCandidate', peerId, event.candidate);
        };
        if (userRole === 'broadcaster') {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        } else {
            pc.ontrack = event => { remoteVideo.srcObject = event.streams[0]; };
        }
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') statusDiv.textContent = 'Broadcasting live! (Mesh)';
        };
        return pc;
    }

    async function getCameraStream() {
        const selectedSource = document.querySelector('input[name="cameraSource"]:checked').value;
        if (selectedSource === 'local') {
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (error) {
                console.error('Could not get user media.', error);
                throw new Error('Could not access local camera/microphone. Please check permissions.');
            }
        } else {
            const url = ipCameraUrlInput.value;
            if (!url) throw new Error('Please enter the IP Camera stream URL.');
            return new Promise((resolve, reject) => {
                const ipVideoElement = document.createElement('video');
                ipVideoElement.setAttribute('crossorigin', 'anonymous');
                ipVideoElement.src = url;
                ipVideoElement.addEventListener('loadeddata', () => {
                    ipVideoElement.play().then(() => {
                        let stream = ipVideoElement.captureStream ? ipVideoElement.captureStream() : null;
                        if (stream) resolve(stream);
                        else reject(new Error('captureStream API is not supported.'));
                    }).catch(e => reject(new Error(`Could not play the IP Camera stream. Error: ${e.message}`)));
                });
                ipVideoElement.addEventListener('error', (e) => reject(new Error('Could not load the IP Camera stream.')));
            });
        }
    }

    function switchToStreamingView() {
        roleSection.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
        if (userRole === 'broadcaster') {
            localVideoContainer.classList.remove('hidden');
        } else {
            remoteVideoContainer.classList.remove('hidden');
        }
    }

    function switchToRoleSelection() {
        streamingSection.classList.add('hidden');
        roleSection.classList.remove('hidden');
        localVideoContainer.classList.add('hidden');
        remoteVideoContainer.classList.add('hidden');
        chatSection.classList.add('hidden');
        recordBtn.disabled = false;
        recordBtn.textContent = 'Start Recording';
    }

    async function handleFlushBroadcasts() {
        const apiKey = prompt("Please enter the Admin API Key to flush all broadcasts:");
        if (!apiKey || !confirm("Are you sure you want to end ALL active broadcasts?")) return;
        try {
            statusDiv.textContent = 'Flushing all broadcasts...';
            const response = await fetch(`${API_URL}/api/broadcast/flush`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to flush broadcasts.');
            alert(result.message || 'Successfully flushed all broadcasts.');
        } catch (error) {
            console.error('Flush failed:', error);
            alert(`Error: ${error.message}`);
        } finally {
            statusDiv.textContent = '';
        }
    }
})();