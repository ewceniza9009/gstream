let API_URL;

(async function () {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Could not fetch server configuration.');
        const config = await response.json();
        API_URL = config.apiUrl;
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.body.innerHTML = '<h1>Error: Could not connect to the server. Please refresh the page.</h1>';
        return;
    }

    const loginSection = document.getElementById('login-section');
    const streamingSection = document.getElementById('streaming-section');
    const broadcastDashboard = document.getElementById('broadcast-dashboard');
    const roomSelectionSection = document.getElementById('room-selection-section');
    const configureSection = document.getElementById('configure-section');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const adminLink = document.getElementById('admin-link');
    const navLinks = document.getElementById('nav-links');
    const startBroadcastBtn = document.getElementById('start-broadcast-button');
    const leaveBtn = document.getElementById('leave-button');
    const recordBtn = document.getElementById('record-button');
    const localVideo = document.getElementById('localVideo');
    const localVideoContainer = document.getElementById('local-video-container');
    const statusDiv = document.getElementById('status');
    const selectedRoomNameSpan = document.getElementById('selected-room-name');
    const roomIdInput = document.getElementById('room-id');
    const roomSearchInput = document.getElementById('room-search-input');
    const roomList = document.getElementById('room-list');
    const backToRoomsBtn = document.getElementById('back-to-rooms-btn');
    const cameraSourceRadios = document.querySelectorAll('input[name="cameraSource"]');
    const ipCameraSection = document.getElementById('ip-camera-section');
    const ipCameraUrlInput = document.getElementById('ip-camera-url');
    const chatSection = document.getElementById('chat-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginHeader = document.getElementById('login-header');
    const dashboardHeader = document.getElementById('dashboard-header');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const viewerCountNumber = document.getElementById('viewer-count-number');


    let jwtToken;
    let signalRConnection;
    let localStream;
    let peerConnections = {};
    let currentRoomId;
    let userRole;
    let livekitRoom;
    let broadcastType;
    let myUsername;
    let allRooms = [];
    let isAdmin = false;

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    initializeApplicationState();

    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    logoutButton.addEventListener('click', handleLogout);
    startBroadcastBtn.addEventListener('click', startBroadcast);
    leaveBtn.addEventListener('click', handleLeave);
    roomSearchInput.addEventListener('input', handleSearch);
    backToRoomsBtn.addEventListener('click', showRoomSelection);

    chatSendButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
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

    cameraSourceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            ipCameraSection.classList.toggle('hidden', document.querySelector('input[name="cameraSource"]:checked').value !== 'ip');
        });
    });

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    function updateNav() {
        if (!jwtToken) return;
        const decodedToken = parseJwt(jwtToken);
        if (decodedToken && decodedToken.role === 'Admin') {
            isAdmin = true;
            adminLink.classList.remove('hidden');
        } else {
            isAdmin = false;
            adminLink.classList.add('hidden');
        }
    }

    async function handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username: username, Password: password })
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Invalid credentials');

            const data = await response.json();
            jwtToken = data.token;
            myUsername = username;
            localStorage.setItem('jwtToken', jwtToken);
            localStorage.setItem('myUsername', myUsername);

            document.getElementById('password').value = '';

            loginHeader.classList.add('hidden');
            loginSection.classList.add('hidden');
            dashboardHeader.classList.remove('hidden');

            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.role === 'Consumer') {
                broadcastDashboard.innerHTML = `
                <div class="text-center p-8 bg-gray-800 rounded-lg">
                    <h3 class="text-2xl font-semibold text-yellow-400">Access Denied</h3>
                    <p class="text-gray-300 mt-2">Your account does not have permission to broadcast.</p>
                    <p class="text-gray-300 mt-1">You can manage your account using the links in the header.</p>
                </div>`;
                broadcastDashboard.classList.remove('hidden');
            } else {
                broadcastDashboard.classList.remove('hidden');
                await fetchAndRenderRooms();
            }
            updateNav();
        } catch (error) {
            loginError.textContent = `Login failed: ${error.message}`;
        }
    }

    function initializeApplicationState() {
        jwtToken = localStorage.getItem('jwtToken');
        myUsername = localStorage.getItem('myUsername');
        if (jwtToken && myUsername) {
            loginHeader.classList.add('hidden');
            loginSection.classList.add('hidden');
            dashboardHeader.classList.remove('hidden');

            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.role === 'Consumer') {
                broadcastDashboard.innerHTML = `
                <div class="text-center p-8 bg-gray-800 rounded-lg">
                    <h3 class="text-2xl font-semibold text-yellow-400">Access Denied</h3>
                    <p class="text-gray-300 mt-2">Your account does not have permission to broadcast.</p>
                    <p class="text-gray-300 mt-1">You can manage your account using the links in the header.</p>
                </div>`;
                broadcastDashboard.classList.remove('hidden');
            } else {
                broadcastDashboard.classList.remove('hidden');
                fetchAndRenderRooms();
            }
            updateNav();
        }
    }

    async function handleLogout() {
        await handleLeave();
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('myUsername');
        jwtToken = null;
        myUsername = null;

        dashboardHeader.classList.add('hidden');
        broadcastDashboard.classList.add('hidden');
        streamingSection.classList.add('hidden');

        loginHeader.classList.remove('hidden');
        loginSection.classList.remove('hidden');
    }

    function showRoomSelection() {
        configureSection.classList.add('hidden');
        roomSelectionSection.classList.remove('hidden');
        streamingSection.classList.add('hidden');
    }

    function showConfigureSection(roomName) {
        roomSelectionSection.classList.add('hidden');
        configureSection.classList.remove('hidden');
        selectedRoomNameSpan.textContent = roomName;
        roomIdInput.value = roomName;
    }

    async function fetchAndRenderRooms() {
        roomList.innerHTML = '<p class="text-gray-400 col-span-full text-center">Loading rooms...</p>';
        try {
            const response = await fetch(`${API_URL}/api/rooms`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch rooms.');
            allRooms = await response.json();
            renderRoomList(allRooms);
        } catch (error) {
            roomList.innerHTML = `<p class="text-red-400 p-4 col-span-full">${error.message}</p>`;
        }
    }

    function renderRoomList(rooms) {
        roomList.innerHTML = '';
        if (rooms.length === 0) {
            roomList.innerHTML = '<p class="text-gray-400 col-span-full text-center">No rooms available.</p>';
            return;
        }
        rooms.forEach(room => {
            const statusColors = { 'Broadcasting': 'bg-red-500', 'Open': 'bg-green-500', 'Ended': 'bg-gray-500' };
            const statusColor = statusColors[room.status] || 'bg-yellow-500';
            const isBroadcasting = room.status === 'Broadcasting';

            const card = document.createElement('div');
            card.className = 'bg-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-md';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h4 class="text-lg font-bold text-white break-all pr-2">${room.name}</h4>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusColor} text-white whitespace-nowrap">${room.status}</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">${room.broadcasterUsername ? `Broadcaster: ${room.broadcasterUsername}` : 'Ready to stream'}</p>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-room-name="${room.name}" class="use-room-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm" ${isBroadcasting ? 'disabled' : ''}>
                        ${isBroadcasting ? 'In Use' : 'Use'}
                    </button>
                </div>`;
            roomList.appendChild(card);
        });

        document.querySelectorAll('.use-room-btn').forEach(btn => btn.addEventListener('click', (e) => {
            showConfigureSection(e.currentTarget.dataset.roomName);
        }));
    }

    function handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const filteredRooms = allRooms.filter(room => room.name.toLowerCase().includes(query));
        renderRoomList(filteredRooms);
    }

    async function startBroadcast() {
        userRole = 'broadcaster';
        currentRoomId = roomIdInput.value;
        broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;
        if (!currentRoomId) { alert('Please select a room first.'); return; }

        try {
            localStream = await getCameraStream();
            localVideo.srcObject = localStream;
            switchToStreamingView();

            if (broadcastType === 'sfu') {
                await startSfuBroadcast();
            } else {
                await startMeshBroadcast();
            }
            await fetchAndRenderRooms();
        } catch (error) {
            alert(error.message || 'Could not start broadcast.');
            handleLeave();
        }
    }

    async function startMeshBroadcast() {
        if (!await initializeSignalR()) throw new Error('Failed to connect for mesh broadcast.');
        await signalRConnection.invoke('StartBroadcast', currentRoomId, 'mesh');
        statusDiv.textContent = `Waiting for viewers (Mesh): ${currentRoomId}`;
    }

    async function startSfuBroadcast() {
        statusDiv.textContent = 'Initializing SFU broadcast...';
        try {
            const response = await fetch(`${API_URL}/api/broadcast/start/sfu/${currentRoomId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${jwtToken}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to initialize SFU broadcast.');
            const { liveKitUrl, token, username } = await response.json();

            myUsername = username;
            livekitRoom = new LivekitClient.Room();

            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                console.log('--- BROADCASTER: LiveKit Data Received ---', { topic, from: participant.identity });
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

            await livekitRoom.connect(liveKitUrl, token);
            console.log('--- BROADCASTER: Connected to LiveKit Room ---');

            statusDiv.textContent = `Broadcasting to room: ${currentRoomId} (SFU)`;

            if (localStream.getVideoTracks().length > 0) await livekitRoom.localParticipant.publishTrack(localStream.getVideoTracks()[0]);
            if (localStream.getAudioTracks().length > 0) await livekitRoom.localParticipant.publishTrack(localStream.getAudioTracks()[0]);

            livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, () => {
                viewerCountNumber.textContent = livekitRoom.numParticipants;
            });
            livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => {
                viewerCountNumber.textContent = livekitRoom.numParticipants;
            });

            fetchAndRenderChatHistory(currentRoomId);
        } catch (error) {
            console.error('SFU broadcast failed:', error);
            throw error;
        }
    }

    async function handleLeave() {
        if (userRole === 'broadcaster' && broadcastType === 'sfu' && currentRoomId) {
            try {
                await fetch(`${API_URL}/api/broadcast/end/sfu/${currentRoomId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${jwtToken}` } });
            } catch (error) { console.error('Error sending end signal:', error); }
        }
        if (livekitRoom) { await livekitRoom.disconnect(); livekitRoom = null; }
        if (signalRConnection) { await signalRConnection.stop(); signalRConnection = null; }
        if (localStream) { localStream.getTracks().forEach(track => track.stop()); localStream = null; }
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};

        streamingSection.classList.add('hidden');
        broadcastDashboard.classList.remove('hidden');
        showRoomSelection();
        await fetchAndRenderRooms();
    }


    async function initializeSignalR() {
        signalRConnection = new signalR.HubConnectionBuilder().withUrl(`${API_URL}/broadcasthub?access_token=${jwtToken}`).withAutomaticReconnect().build();
        signalRConnection.on('NewViewer', async (viewerId) => {
            statusDiv.textContent = `New viewer joined...`;
            const pc = createPeerConnection(viewerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await signalRConnection.invoke('SendOfferToViewer', viewerId, offer);
        });
        signalRConnection.on('ReceiveAnswerFromViewer', async (answer, viewerId) => {
            await peerConnections[viewerId]?.setRemoteDescription(new RTCSessionDescription(answer));
        });
        signalRConnection.on('ReceiveChatMessage', (messageId, user, message) => displayChatMessage(messageId, user, message, user === myUsername));
        signalRConnection.on('ViewerLeft', (viewerId) => {
            peerConnections[viewerId]?.close();
            delete peerConnections[viewerId];
        });
        signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
            await Object.values(peerConnections)[0]?.addIceCandidate(new RTCIceCandidate(candidate));
        });
        signalRConnection.on('BroadcastEnded', () => { alert('The broadcast has ended.'); handleLeave(); });
        signalRConnection.on('BroadcastExists', () => { alert('Error: A broadcast is already active in this room.'); showRoomSelection(); });
        signalRConnection.on('UpdateViewerCount', (count) => { viewerCountNumber.textContent = count; });
        signalRConnection.on('MessageDeleted', (messageId) => {
            const msgElement = document.getElementById(`chat-msg-${messageId}`);
            if (msgElement) msgElement.remove();
        });


        try {
            await signalRConnection.start();
            fetchAndRenderChatHistory(currentRoomId);
            return true;
        } catch (error) { return false; }
    }

    function createPeerConnection(peerId) {
        const pc = new RTCPeerConnection(iceServers);
        peerConnections[peerId] = pc;
        pc.onicecandidate = event => { if (event.candidate) signalRConnection.invoke('SendIceCandidate', peerId, event.candidate); };
        if (userRole === 'broadcaster') {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }
        pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') statusDiv.textContent = 'Broadcasting live! (Mesh)'; };
        return pc;
    }

    async function getCameraStream() {
        const selectedSource = document.querySelector('input[name="cameraSource"]:checked').value;
        if (selectedSource === 'local') {
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (error) { throw new Error('Could not access local camera/microphone.'); }
        } else {
            const url = ipCameraUrlInput.value;
            if (!url) throw new Error('Please enter the IP Camera stream URL.');
            return new Promise((resolve, reject) => {
                const ipVideoElement = document.createElement('video');
                ipVideoElement.crossOrigin = 'anonymous';
                ipVideoElement.src = url;
                ipVideoElement.addEventListener('loadeddata', () => {
                    ipVideoElement.play().then(() => {
                        const stream = ipVideoElement.captureStream ? ipVideoElement.captureStream() : null;
                        if (stream) resolve(stream);
                        else reject(new Error('captureStream API is not supported by your browser.'));
                    }).catch(e => reject(new Error(`Could not play the IP Camera stream.`)));
                });
                ipVideoElement.addEventListener('error', () => reject(new Error('Could not load the IP Camera stream.')));
            });
        }
    }

    function switchToStreamingView() {
        broadcastDashboard.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
        localVideoContainer.classList.remove('hidden');
    }

    async function fetchAndRenderChatHistory(roomId) {
        chatMessages.innerHTML = '';
        try {
            const response = await fetch(`${API_URL}/api/rooms/${roomId}/chat`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) return;
            const history = await response.json();
            history.forEach(msg => displayChatMessage(msg.id, msg.username, msg.content, msg.username === myUsername));
        } catch (e) {
            console.error("Could not fetch chat history", e);
        }
    }

    async function sendChatMessage() {
        const text = chatInput.value;
        if (!text) return;
        chatInput.value = '';

        if (broadcastType === 'mesh' && signalRConnection) {
            signalRConnection.invoke('SendChatMessage', currentRoomId, text);
            return;
        }

        if (broadcastType === 'sfu' && livekitRoom) {
            let payload = {
                id: Date.now(),
                username: myUsername,
                content: text,
                timestamp: new Date().toISOString()
            };

            if (jwtToken) {
                try {
                    const response = await fetch(`${API_URL}/api/rooms/${currentRoomId}/chat`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Content: text })
                    });
                    if (response.ok) {
                        const savedMessageDto = await response.json();
                        payload = savedMessageDto;                             
                    } else {
                        console.warn('Could not save chat message to history. Sending as real-time only.');
                    }
                } catch (error) {
                    console.error("API call to save chat message failed:", error);
                }
            }

            console.log('--- BROADCASTER: Publishing Chat Data ---', payload);
            const data = new TextEncoder().encode(JSON.stringify(payload));

            livekitRoom.localParticipant.publishData(data, { reliable: true, topic: 'chat' });

            displayChatMessage(payload.id, payload.username, payload.content, true);
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

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `<i class="fas fa-times-circle text-gray-500 hover:text-red-400"></i>`;
        deleteBtn.className = 'delete-msg-btn';
        deleteBtn.dataset.messageId = id;
        deleteBtn.onclick = () => handleDeleteMessage(id);

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble flex flex-col w-full max-w-xs p-2.5 rounded-lg' + (isSelf ? ' rounded-br-none bg-blue-700' : ' rounded-bl-none bg-gray-600');
        bubble.innerHTML = `<p class="text-sm font-normal text-white break-words">${message}</p>`;

        header.appendChild(usernameSpan);
        if (isAdmin || userRole === 'broadcaster') {
            header.appendChild(deleteBtn);
        }

        bubbleContainer.appendChild(header);
        bubbleContainer.appendChild(bubble);

        if (isSelf) {
            msgContainer.appendChild(bubbleContainer);
            msgContainer.appendChild(avatar);
        } else {
            msgContainer.appendChild(avatar);
            msgContainer.appendChild(bubbleContainer);
        }

        chatMessages.appendChild(msgContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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

    function handleDeleteMessage(messageId) {
        if (!confirm("Are you sure you want to delete this message?")) return;

        if (broadcastType === 'sfu' && livekitRoom) {
            const data = new TextEncoder().encode(JSON.stringify({ action: 'delete', id: messageId }));
            livekitRoom.localParticipant.publishData(data, LivekitClient.DataPacket_Kind.RELIABLE, { topic: 'moderation' });
            const msgElement = document.getElementById(`chat-msg-${messageId}`);
            if (msgElement) msgElement.remove();

        } else if (broadcastType === 'mesh' && signalRConnection) {
            signalRConnection.invoke('DeleteMessage', currentRoomId, messageId).catch(err => console.error(err));
        }
    }


    async function handleRegister() {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const registerError = document.getElementById('register-error');
        registerError.textContent = '';

        if (!username || !password) {
            registerError.textContent = 'Username and password are required.';
            return;
        }
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match.';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username: username, Password: password })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Registration failed.');
            }

            alert('Registration successful! Please log in.');
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
            showLoginLink.click();

        } catch (error) {
            registerError.textContent = error.message;
            console.error('Registration failed:', error);
        }
    }
})();