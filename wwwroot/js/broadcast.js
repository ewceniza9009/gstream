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

    // --- DOM Elements ---
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
    const roomIdInput = document.getElementById('room-id'); // This is a hidden input now

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

    // --- State Variables ---
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

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // --- Initialization ---
    initializeApplicationState();

    // --- Event Listeners ---
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

    // --- Helper Functions ---
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
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }
    }

    // --- Authentication & State ---
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

            // --- START: Corrected Role Logic ---
            loginHeader.classList.add('hidden');
            loginSection.classList.add('hidden');
            dashboardHeader.classList.remove('hidden');

            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.role === 'Consumer') {
                // For consumers, just show the header but not the broadcast rooms
                broadcastDashboard.innerHTML = `
                <div class="text-center p-8 bg-gray-800 rounded-lg">
                    <h3 class="text-2xl font-semibold text-yellow-400">Access Denied</h3>
                    <p class="text-gray-300 mt-2">Your account does not have permission to broadcast.</p>
                    <p class="text-gray-300 mt-1">You can manage your account using the links in the header.</p>
                </div>`;
                broadcastDashboard.classList.remove('hidden');
            } else {
                // For Admins/Broadcasters, show the rooms
                broadcastDashboard.classList.remove('hidden');
                await fetchAndRenderRooms();
            }
            updateNav();
            // --- END: Corrected Role Logic ---

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

            // --- START: Corrected Role Logic for Page Load ---
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
            // --- END: Corrected Role Logic for Page Load ---
        }
    }

    async function handleLogout() {
        await handleLeave();
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('myUsername');
        jwtToken = null;
        myUsername = null;

        // Hide all dashboard/header elements
        dashboardHeader.classList.add('hidden');
        broadcastDashboard.classList.add('hidden');
        streamingSection.classList.add('hidden');

        // Show all login elements
        loginHeader.classList.remove('hidden');
        loginSection.classList.remove('hidden');

        // REMOVE THIS LINE
        // showRoomSelection(); 
    }

    // --- Broadcaster UI Flow ---
    function showRoomSelection() {
        configureSection.classList.add('hidden');
        roomSelectionSection.classList.remove('hidden');
        streamingSection.classList.add('hidden');

        // REMOVE THIS LINE
        // broadcastDashboard.classList.remove('hidden');
    }

    function showConfigureSection(roomName) {
        roomSelectionSection.classList.add('hidden');
        configureSection.classList.remove('hidden');
        selectedRoomNameSpan.textContent = roomName;
        roomIdInput.value = roomName; // The hidden input
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

    // --- Broadcasting ---
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
            await fetchAndRenderRooms(); // Refresh room list to show new status
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
            await livekitRoom.connect(liveKitUrl, token);

            statusDiv.textContent = `Broadcasting to room: ${currentRoomId} (SFU)`;

            if (localStream.getVideoTracks().length > 0) await livekitRoom.localParticipant.publishTrack(localStream.getVideoTracks()[0]);
            if (localStream.getAudioTracks().length > 0) await livekitRoom.localParticipant.publishTrack(localStream.getAudioTracks()[0]);

            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload) => {
                const message = JSON.parse(new TextDecoder().decode(payload));
                displayChatMessage(message.username, message.text, false);
            });

            // Fetch and render chat history on join
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

        // --- Start of Fix ---
        // Hide the streaming view specifically
        streamingSection.classList.add('hidden');
        // Show the main dashboard container and the room selection view within it
        broadcastDashboard.classList.remove('hidden');
        showRoomSelection();
        // --- End of Fix ---
        await fetchAndRenderRooms(); // Refresh room list after leaving
    }


    // --- WebRTC & SignalR (for Mesh) ---
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
        signalRConnection.on('ReceiveChatMessage', (user, message) => displayChatMessage(user, message, user === myUsername));
        signalRConnection.on('ViewerLeft', (viewerId) => {
            peerConnections[viewerId]?.close();
            delete peerConnections[viewerId];
        });
        signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
            await Object.values(peerConnections)[0]?.addIceCandidate(new RTCIceCandidate(candidate));
        });
        signalRConnection.on('BroadcastEnded', () => { alert('The broadcast has ended.'); handleLeave(); });
        signalRConnection.on('BroadcastExists', () => { alert('Error: A broadcast is already active in this room.'); showRoomSelection(); });

        try {
            await signalRConnection.start();
            // Fetch and render chat history on join for mesh
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


    // --- Media & UI Helpers ---
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

    // --- Chat ---
    async function fetchAndRenderChatHistory(roomId) {
        chatMessages.innerHTML = '';
        try {
            const response = await fetch(`${API_URL}/api/rooms/${roomId}/chat`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) return;
            const history = await response.json();
            history.forEach(msg => displayChatMessage(msg.username, msg.content, msg.username === myUsername));
        } catch (e) {
            console.error("Could not fetch chat history", e);
        }
    }

    function sendChatMessage() {
        const text = chatInput.value;
        if (!text) return;
        if (broadcastType === 'sfu' && livekitRoom) {
            const data = new TextEncoder().encode(JSON.stringify({ username: myUsername, text }));
            livekitRoom.localParticipant.publishData(data, LivekitClient.DataPacket_Kind.RELIABLE);
            displayChatMessage(myUsername, text, true);
        } else if (broadcastType === 'mesh' && signalRConnection) {
            signalRConnection.invoke('SendChatMessage', currentRoomId, text);
        }
        chatInput.value = '';
    }

    function displayChatMessage(user, message, isSelf) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('p-2', 'rounded-lg', 'mb-2', 'chat-message', 'max-w-xs', 'w-fit', 'break-words');
        msgDiv.classList.toggle('self', isSelf);
        msgDiv.classList.toggle('other', !isSelf);
        msgDiv.innerHTML = `<span class="font-bold block">${isSelf ? "You" : user}</span> ${message}`;
        // Insert at the bottom, and scroll down
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Registration ---
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