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
    const leaveBtn = document.getElementById('leave-button');
    const logoutButtonRole = document.getElementById('logout-button-role');
    const logoutButtonStreaming = document.getElementById('logout-button-streaming');
    const localVideoContainer = document.getElementById('local-video-container');
    const localVideo = document.getElementById('localVideo');
    const statusDiv = document.getElementById('status');
    const roomIdInput = document.getElementById('room-id');
    const chatSection = document.getElementById('chat-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const roomManagementSection = document.getElementById('room-management-section');
    const roomListContainer = document.getElementById('room-list');
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomModal = document.getElementById('room-modal');
    const roomModalTitle = document.getElementById('room-modal-title');
    const roomModalForm = document.getElementById('room-modal-form');
    const roomNameInputModal = document.getElementById('room-name-modal');
    const roomIdInputModal = document.getElementById('room-id-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');


    // --- State Variables ---
    let jwtToken;
    let localStream;
    let currentRoomId;
    let livekitRoom;
    let myUsername;

    // --- Initialization ---
    initializeApplicationState();

    // --- Event Listeners ---
    loginButton.addEventListener('click', handleLogin);
    startBroadcastBtn.addEventListener('click', startBroadcast);
    leaveBtn.addEventListener('click', handleLeave);
    logoutButtonRole.addEventListener('click', handleLogout);
    logoutButtonStreaming.addEventListener('click', handleLogout);
    chatSendButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Room Modal Listeners
    createRoomBtn.addEventListener('click', () => openRoomModal());
    closeModalBtn.addEventListener('click', () => closeRoomModal());
    roomModalForm.addEventListener('submit', handleSaveRoom);


    // --- Authentication & State Management ---
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
                throw new Error(errorData.message || 'Invalid credentials');
            }

            const data = await response.json();
            jwtToken = data.token;
            myUsername = username;
            localStorage.setItem('jwtToken', jwtToken);
            localStorage.setItem('myUsername', myUsername);

            passwordInput.value = '';
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
        if (livekitRoom) await handleLeave();
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('myUsername');
        jwtToken = null;
        myUsername = null;
        loginSection.classList.remove('hidden');
        roleSection.classList.add('hidden');
        streamingSection.classList.add('hidden');
        roomManagementSection.classList.add('hidden');
    }

    // --- Room Management (CRUD) ---

    async function fetchAndRenderRooms() {
        roomListContainer.innerHTML = '<p class="text-gray-400">Loading rooms...</p>';
        try {
            const response = await fetch(`${API_URL}/api/rooms`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch rooms.');
            const rooms = await response.json();
            renderRoomList(rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            roomListContainer.innerHTML = `<p class="text-red-400 p-4">Could not load rooms.</p>`;
        }
    }

    function renderRoomList(rooms) {
        roomListContainer.innerHTML = '';
        if (rooms.length === 0) {
            roomListContainer.innerHTML = '<p class="text-gray-400 col-span-full text-center">No rooms found. Create one to get started!</p>';
            return;
        }

        rooms.forEach(room => {
            const statusColors = {
                'Broadcasting': 'bg-green-200 text-green-800',
                'Open': 'bg-blue-200 text-blue-800',
                'Ended': 'bg-gray-200 text-gray-800'
            };
            const statusColor = statusColors[room.status] || 'bg-yellow-200 text-yellow-800';

            const card = document.createElement('div');
            card.className = 'bg-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-md';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h4 class="text-lg font-bold text-white break-all pr-2">${room.name}</h4>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusColor} whitespace-nowrap">${room.status}</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">
                        ${room.broadcasterUsername ? `Broadcaster: ${room.broadcasterUsername}` : 'No active broadcaster'}
                    </p>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-room-name="${room.name}" class="use-room-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-300">Use</button>
                    <button data-room-id="${room.id}" data-room-name="${room.name}" class="edit-room-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm transition duration-300"><i class="fas fa-pencil-alt"></i></button>
                    <button data-room-id="${room.id}" class="delete-room-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-300"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            roomListContainer.appendChild(card);
        });

        // Add event listeners to new buttons
        document.querySelectorAll('.use-room-btn').forEach(btn => btn.addEventListener('click', (e) => {
            roomIdInput.value = e.currentTarget.dataset.roomName;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }));
        document.querySelectorAll('.edit-room-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const { roomId, roomName } = e.currentTarget.dataset;
            openRoomModal(roomId, roomName);
        }));
        document.querySelectorAll('.delete-room-btn').forEach(btn => btn.addEventListener('click', (e) => {
            handleDeleteRoom(e.currentTarget.dataset.roomId);
        }));
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
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `Failed to ${id ? 'update' : 'create'} room.`);
            }

            closeRoomModal();
            await fetchAndRenderRooms();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleDeleteRoom(id) {
        if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;

        try {
            const response = await fetch(`${API_URL}/api/rooms/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete room.');
            }
            await fetchAndRenderRooms();
        } catch (error) {
            alert(error.message);
        }
    }


    // --- Broadcasting Logic ---

    async function startBroadcast() {
        currentRoomId = roomIdInput.value;
        if (!currentRoomId) {
            alert('Please enter or select a Room ID.');
            return;
        }

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            switchToStreamingView();
            await startSfuBroadcast();
        } catch (error) {
            console.error('Could not start broadcast.', error);
            alert(error.message || 'Could not access camera/microphone. Please check permissions.');
            handleLeave();
        }
    }

    async function startSfuBroadcast() {
        statusDiv.textContent = 'Initializing broadcast...';
        try {
            const response = await fetch(`${API_URL}/api/broadcast/start/sfu/${currentRoomId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to initialize broadcast.');
            }
            const { liveKitUrl, token, username } = await response.json();
            myUsername = username;

            livekitRoom = new LivekitClient.Room();
            await livekitRoom.connect(liveKitUrl, token);
            statusDiv.textContent = `Broadcasting live to room: ${currentRoomId}`;

            await livekitRoom.localParticipant.setCameraEnabled(true);
            await livekitRoom.localParticipant.setMicrophoneEnabled(true);

            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant) => {
                const message = JSON.parse(new TextDecoder().decode(payload));
                displayChatMessage(message.username, message.text, false);
            });
            await fetchAndRenderRooms();

        } catch (error) {
            console.error('Broadcast failed:', error);
            throw error;
        }
    }

    async function handleLeave() {
        if (livekitRoom) {
            // Gracefully end the broadcast on the server
            try {
                await fetch(`${API_URL}/api/broadcast/end/sfu/${currentRoomId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
            } catch (error) {
                console.error('Error sending end signal for broadcast:', error);
            }
            await livekitRoom.disconnect();
            livekitRoom = null;
        }
        switchToRoleSelection();
        statusDiv.textContent = '';
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
            localVideo.srcObject = null;
        }
        await fetchAndRenderRooms();
    }

    // --- UI Switching ---

    function switchToStreamingView() {
        roleSection.classList.add('hidden');
        streamingSection.classList.remove('hidden');
        chatSection.classList.remove('hidden');
        localVideoContainer.classList.remove('hidden');
    }

    function switchToRoleSelection() {
        streamingSection.classList.add('hidden');
        roleSection.classList.remove('hidden');
        localVideoContainer.classList.add('hidden');
        chatSection.classList.add('hidden');
    }

    // --- Chat ---
    function sendChatMessage() {
        const text = chatInput.value;
        if (!text || !livekitRoom) return;
        const data = new TextEncoder().encode(JSON.stringify({ username: myUsername, text }));
        livekitRoom.localParticipant.publishData(data, LivekitClient.DataPacket_Kind.RELIABLE);
        displayChatMessage(myUsername, text, true);
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
})();