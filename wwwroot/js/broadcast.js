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

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const registerButton = document.getElementById('register-button');

    // Room Management & Search Elements
    const roomManagementSection = document.getElementById('room-management-section');
    const roomListContainer = document.getElementById('room-list');
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomSearchInput = document.getElementById('room-search-input');
    const roomModal = document.getElementById('room-modal');
    const roomModalTitle = document.getElementById('room-modal-title');
    const roomModalForm = document.getElementById('room-modal-form');
    const roomNameInputModal = document.getElementById('room-name-modal');
    const roomIdInputModal = document.getElementById('room-id-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

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
    let allRooms = []; // To store the master list of rooms for searching

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

    // Room Management & Search Listeners
    createRoomBtn.addEventListener('click', () => openRoomModal());
    closeModalBtn.addEventListener('click', () => closeRoomModal());
    roomModalForm.addEventListener('submit', handleSaveRoom);
    roomSearchInput.addEventListener('input', handleSearch);


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
            loginSection.classList.add('hidden');
            roleSection.classList.remove('hidden');
            roomManagementSection.classList.remove('hidden');
            await fetchAndRenderRooms();
        } catch (error) {
            loginError.textContent = `Login failed: ${error.message}`;
        }
    }

    function initializeApplicationState() {
        jwtToken = localStorage.getItem('jwtToken');
        myUsername = localStorage.getItem('myUsername');
        if (jwtToken && myUsername) {
            loginSection.classList.add('hidden');
            roleSection.classList.remove('hidden');
            roomManagementSection.classList.remove('hidden');
            fetchAndRenderRooms();
        }
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
        roomManagementSection.classList.add('hidden');
    }


    // --- Room Management & Search ---
    async function fetchAndRenderRooms() {
        roomListContainer.innerHTML = '<p class="text-gray-400 col-span-full text-center">Loading rooms...</p>';
        try {
            const response = await fetch(`${API_URL}/api/rooms`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch rooms.');
            allRooms = await response.json();
            renderRoomList(allRooms);
        } catch (error) {
            roomListContainer.innerHTML = `<p class="text-red-400 p-4 col-span-full">Could not load rooms.</p>`;
        }
    }

    function renderRoomList(rooms) {
        roomListContainer.innerHTML = '';
        if (rooms.length === 0) {
            roomListContainer.innerHTML = '<p class="text-gray-400 col-span-full text-center">No rooms match your search.</p>';
            return;
        }
        rooms.forEach(room => {
            const statusColors = { 'Broadcasting': 'bg-green-200 text-green-800', 'Open': 'bg-blue-200 text-blue-800', 'Ended': 'bg-gray-200 text-gray-800' };
            const statusColor = statusColors[room.status] || 'bg-yellow-200 text-yellow-800';
            const card = document.createElement('div');
            card.className = 'bg-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-md';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h4 class="text-lg font-bold text-white break-all pr-2">${room.name}</h4>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusColor} whitespace-nowrap">${room.status}</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">${room.broadcasterUsername ? `Broadcaster: ${room.broadcasterUsername}` : 'No active broadcaster'}</p>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-room-name="${room.name}" class="use-room-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm">Use</button>
                    <button data-room-id="${room.id}" data-room-name="${room.name}" class="edit-room-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-pencil-alt"></i></button>
                    <button data-room-id="${room.id}" class="delete-room-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            roomListContainer.appendChild(card);
        });
        document.querySelectorAll('.use-room-btn').forEach(btn => btn.addEventListener('click', (e) => {
            roomIdInput.value = e.currentTarget.dataset.roomName;
            roomIdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }));
        document.querySelectorAll('.edit-room-btn').forEach(btn => btn.addEventListener('click', (e) => openRoomModal(e.currentTarget.dataset.roomId, e.currentTarget.dataset.roomName)));
        document.querySelectorAll('.delete-room-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteRoom(e.currentTarget.dataset.roomId)));
    }

    function handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const filteredRooms = allRooms.filter(room => room.name.toLowerCase().includes(query));
        renderRoomList(filteredRooms);
    }

    function openRoomModal(id = null, name = '') {
        roomModalForm.reset();
        roomIdInputModal.value = id;
        roomNameInputModal.value = name;
        roomModalTitle.textContent = id ? 'Edit Room' : 'Create Room';
        roomModal.classList.remove('hidden');
        roomModal.classList.add('flex');
    }

    function closeRoomModal() {
        roomModal.classList.add('hidden');
        roomModal.classList.remove('flex');
    }

    async function handleSaveRoom(e) {
        e.preventDefault();
        const id = roomIdInputModal.value;
        const name = roomNameInputModal.value;
        const url = id ? `${API_URL}/api/rooms/${id}` : `${API_URL}/api/rooms`;
        const method = id ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` }, body: JSON.stringify({ name }) });
            if (!response.ok) throw new Error((await response.json()).message || `Failed to save room.`);
            closeRoomModal();
            await fetchAndRenderRooms();
        } catch (error) { alert(error.message); }
    }

    async function handleDeleteRoom(id) {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            const response = await fetch(`${API_URL}/api/rooms/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${jwtToken}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete room.');
            await fetchAndRenderRooms();
        } catch (error) { alert(error.message); }
    }


    // --- Broadcasting ---
    async function startBroadcast() {
        userRole = 'broadcaster';
        currentRoomId = roomIdInput.value;
        broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;
        if (!currentRoomId) { alert('Please enter a Room ID.'); return; }
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

    async function viewBroadcast() {
        userRole = 'viewer';
        currentRoomId = roomIdInput.value;
        if (!currentRoomId) { alert('Please enter a Room ID to view.'); return; }
        alert("Viewing is handled on the consumer page. This is for local mesh testing only.");
        if (!await initializeSignalR()) { alert('Failed to connect to server.'); return; }
        switchToStreamingView();
        await signalRConnection.invoke('ViewBroadcast', currentRoomId);
        statusDiv.textContent = `Viewing room: ${currentRoomId}`;
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
        switchToRoleSelection();
        await fetchAndRenderRooms();
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
        signalRConnection.on('BroadcastExists', () => { alert('Error: A broadcast is already active in this room.'); switchToRoleSelection(); });
        try {
            await signalRConnection.start();
            return true;
        } catch (error) { return false; }
    }

    function createPeerConnection(peerId) {
        const pc = new RTCPeerConnection(iceServers);
        peerConnections[peerId] = pc;
        pc.onicecandidate = event => { if (event.candidate) signalRConnection.invoke('SendIceCandidate', peerId, event.candidate); };
        if (userRole === 'broadcaster') {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        } else {
            pc.ontrack = event => { remoteVideo.srcObject = event.streams[0]; };
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

    async function handleFlushBroadcasts() {
        const apiKey = prompt("Please enter the Admin API Key to flush all broadcasts:");
        if (!apiKey || !confirm("Are you sure you want to end ALL active broadcasts?")) return;
        try {
            const response = await fetch(`${API_URL}/api/broadcast/flush`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey } });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to flush broadcasts.');
            alert(result.message || 'Successfully flushed all broadcasts.');
            await fetchAndRenderRooms();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    function switchToStreamingView() {
        roleSection.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
        userRole === 'broadcaster' ? localVideoContainer.classList.remove('hidden') : remoteVideoContainer.classList.remove('hidden');
    }

    function switchToRoleSelection() {
        streamingSection.classList.add('hidden');
        roleSection.classList.remove('hidden');
        localVideoContainer.classList.add('hidden');
        remoteVideoContainer.classList.add('hidden');
        chatSection.classList.add('hidden');
        statusDiv.textContent = '';
        remoteVideo.srcObject = null;
        localVideo.srcObject = null;
        recordBtn.disabled = false;
        recordBtn.textContent = 'Start Recording';
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
        chatMessages.insertBefore(msgDiv, chatMessages.firstChild);
    }

    // New function to handle registration
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
            // Switch back to the login form
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