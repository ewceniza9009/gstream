document.addEventListener('DOMContentLoaded', () => {
    (async function () {
        let API_URL;

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
        const broadcastDashboard = document.getElementById('broadcast-dashboard');
        const roomSelectionSection = document.getElementById('room-selection-section');
        const configureSection = document.getElementById('configure-section');
        const loginButton = document.getElementById('login-button');
        const registerButton = document.getElementById('register-button');
        const logoutButton = document.getElementById('logout-button');
        const adminLink = document.getElementById('admin-link');
        const startBroadcastBtn = document.getElementById('start-broadcast-button');
        const roomSearchInput = document.getElementById('room-search-input');
        const roomList = document.getElementById('room-list');
        const backToRoomsBtn = document.getElementById('back-to-rooms-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginHeader = document.getElementById('login-header');
        const dashboardHeader = document.getElementById('dashboard-header');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const streamingSection = document.getElementById('streaming-section');

        const videoSourceRadios = document.querySelectorAll('input[name="videoSource"]');
        const systemCameraSection = document.getElementById('system-camera-section');
        const ipCameraSection = document.getElementById('ip-camera-section');
        const ipCameraUrlInput = document.getElementById('ip-camera-url');
        const cameraSelect = document.getElementById('camera-select');
        const refreshCamerasBtn = document.getElementById('refresh-cameras-btn');

        let localVideoContainer, screenShareContainer, chatSection, localVideo, screenShareVideo, statusDiv,
            viewerCountNumber, recordBtn, stopRecordBtn, leaveBtn, startScreenShareBtn, stopScreenShareBtn, createPollBtn, pollModal, pollModalForm,
            closePollModalBtn, addPollOptionBtn, pollResultsContainer, chatMessages, chatInput, chatSendButton;

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
        let screenShareStream = null;
        let screenSharePublication = null;
        let webcamPublication = null;
        let currentPoll = null;
        let streamingEventListenersInitialized = false;
        let currentEgressId = null;                                 

        const iceServers = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
        };

        initializeApplicationState();
        addEventListeners();

        function addEventListeners() {
            loginButton.addEventListener('click', handleLogin);
            registerButton.addEventListener('click', handleRegister);
            logoutButton.addEventListener('click', handleLogout);
            startBroadcastBtn.addEventListener('click', startBroadcast);
            roomSearchInput.addEventListener('input', handleSearch);
            backToRoomsBtn.addEventListener('click', showRoomSelection);
            refreshCamerasBtn.addEventListener('click', getAndPopulateCameras);

            videoSourceRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const isSystemCamera = document.querySelector('input[name="videoSource"]:checked').value === 'system';
                    systemCameraSection.classList.toggle('hidden', !isSystemCamera);
                    ipCameraSection.classList.toggle('hidden', isSystemCamera);
                });
            });

            showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
            showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
        }

        function initializeStreamingEventListeners() {
            if (streamingEventListenersInitialized) return;

            localVideoContainer = document.getElementById('local-video-container');
            screenShareContainer = document.getElementById('screenshare-container');
            chatSection = document.getElementById('chat-section');
            localVideo = document.getElementById('localVideo');
            screenShareVideo = document.getElementById('screenShareVideo');
            statusDiv = document.getElementById('status');
            viewerCountNumber = document.getElementById('viewer-count-number');
            recordBtn = document.getElementById('record-button');
            stopRecordBtn = document.getElementById('stop-record-button');
            leaveBtn = document.getElementById('leave-button');
            startScreenShareBtn = document.getElementById('start-screenshare-button');
            stopScreenShareBtn = document.getElementById('stop-screenshare-button');
            createPollBtn = document.getElementById('create-poll-button');
            pollModal = document.getElementById('poll-modal');
            pollModalForm = document.getElementById('poll-modal-form');
            closePollModalBtn = document.getElementById('close-poll-modal-btn');
            addPollOptionBtn = document.getElementById('add-poll-option-btn');
            pollResultsContainer = document.getElementById('poll-results-container');
            chatMessages = document.getElementById('chat-messages');
            chatInput = document.getElementById('chat-input');
            chatSendButton = document.getElementById('chat-send-button');

            leaveBtn.addEventListener('click', handleLeave);
            startScreenShareBtn.addEventListener('click', () => handleScreenShare(true));
            stopScreenShareBtn.addEventListener('click', () => handleScreenShare(false));
            createPollBtn.addEventListener('click', openPollModal);
            closePollModalBtn.addEventListener('click', closePollModal);
            pollModalForm.addEventListener('submit', handleCreatePoll);
            addPollOptionBtn.addEventListener('click', addPollOption);
            chatSendButton.addEventListener('click', sendChatMessage);
            chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
            recordBtn.addEventListener('click', handleRecording);
            stopRecordBtn.addEventListener('click', handleStopRecording);

            streamingEventListenersInitialized = true;
        }

        function parseJwt(token) {
            try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
        }

        function updateNav() {
            if (!jwtToken) return;
            const decodedToken = parseJwt(jwtToken);
            isAdmin = decodedToken && decodedToken.role === 'Admin';
            userRole = decodedToken ? decodedToken.role.toLowerCase() : 'consumer';
            adminLink.classList.toggle('hidden', !isAdmin);
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

                showDashboard();
            } catch (error) {
                loginError.textContent = `Login failed: ${error.message}`;
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
                document.getElementById('register-form').reset();
                showLoginLink.click();
            } catch (error) {
                registerError.textContent = error.message;
                console.error('Registration failed:', error);
            }
        }

        function initializeApplicationState() {
            jwtToken = localStorage.getItem('jwtToken');
            myUsername = localStorage.getItem('myUsername');
            if (jwtToken && myUsername) {
                showDashboard();
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

        function showDashboard() {
            loginHeader.classList.add('hidden');
            loginSection.classList.add('hidden');
            dashboardHeader.classList.remove('hidden');
            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.role === 'Consumer') {
                broadcastDashboard.innerHTML = `<div class="text-center p-8 bg-gray-800 rounded-lg"><h3 class="text-2xl font-semibold text-yellow-400">Access Denied</h3><p class="text-gray-300 mt-2">Your account does not have permission to broadcast.</p></div>`;
                broadcastDashboard.classList.remove('hidden');
            } else {
                broadcastDashboard.classList.remove('hidden');
                fetchAndRenderRooms();
            }
            updateNav();
        }

        function showRoomSelection() {
            configureSection.classList.add('hidden');
            roomSelectionSection.classList.remove('hidden');
            streamingSection.classList.add('hidden');
        }

        function showConfigureSection(roomName) {
            roomSelectionSection.classList.add('hidden');
            configureSection.classList.remove('hidden');
            document.getElementById('selected-room-name').textContent = roomName;
            document.getElementById('room-id').value = roomName;
            getAndPopulateCameras();
        }

        function switchToStreamingView() {
            broadcastDashboard.classList.add('hidden');
            initializeStreamingEventListeners();
            streamingSection.classList.remove('hidden');
            chatSection.classList.remove('hidden');
            localVideoContainer.classList.remove('hidden');
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
                const card = document.createElement('div');
                card.className = 'bg-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-md';
                card.innerHTML = `<div><div class="flex justify-between items-start"><h4 class="text-lg font-bold text-white break-all pr-2">${room.name}</h4><span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusColors[room.status] || 'bg-yellow-500'} text-white whitespace-nowrap">${room.status}</span></div><p class="text-sm text-gray-400 mt-1">${room.broadcasterUsername ? `Broadcaster: ${room.broadcasterUsername}` : 'Ready to stream'}</p></div><div class="flex justify-end gap-2 mt-4"><button data-room-name="${room.name}" class="use-room-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm" ${room.status === 'Broadcasting' ? 'disabled' : ''}>${room.status === 'Broadcasting' ? 'In Use' : 'Use'}</button></div>`;
                roomList.appendChild(card);
            });
            document.querySelectorAll('.use-room-btn').forEach(btn => btn.addEventListener('click', (e) => showConfigureSection(e.currentTarget.dataset.roomName)));
        }

        function handleSearch(e) {
            const query = e.target.value.toLowerCase();
            const filteredRooms = allRooms.filter(room => room.name.toLowerCase().includes(query));
            renderRoomList(filteredRooms);
        }

        async function getAndPopulateCameras() {
            cameraSelect.innerHTML = '<option>Checking for cameras...</option>';
            try {
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');

                cameraSelect.innerHTML = '';
                if (videoDevices.length === 0) {
                    cameraSelect.innerHTML = '<option value="">No cameras found</option>';
                    return;
                }

                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });
            } catch (error) {
                console.error("Error enumerating devices:", error);
                cameraSelect.innerHTML = '<option value="">Camera access denied</option>';
                alert("Camera and microphone access is required to select a device. Please allow access and click Refresh.");
            }
        }

        async function getCameraStream() {
            const selectedSource = document.querySelector('input[name="videoSource"]:checked').value;

            if (selectedSource === 'system') {
                const deviceId = cameraSelect.value;
                if (!deviceId) {
                    throw new Error('No camera selected or available. Please check permissions and refresh the list.');
                }
                return await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId } },
                    audio: true
                });
            } else {
                const url = ipCameraUrlInput.value;
                if (!url) throw new Error('Please enter the IP Camera stream URL.');

                return new Promise((resolve, reject) => {
                    const ipVideoElement = document.createElement('video');
                    ipVideoElement.crossOrigin = 'anonymous';
                    ipVideoElement.src = url;
                    ipVideoElement.addEventListener('loadeddata', () => {
                        ipVideoElement.play().then(() => {
                            const stream = ipVideoElement.captureStream ? ipVideoElement.captureStream() : ipVideoElement.mozCaptureStream ? ipVideoElement.mozCaptureStream() : null;
                            if (stream) resolve(stream);
                            else reject(new Error('captureStream API is not supported by your browser.'));
                        }).catch(e => reject(new Error(`Could not play the IP Camera stream. Error: ${e.message}`)));
                    });
                    ipVideoElement.addEventListener('error', () => reject(new Error('Could not load the IP Camera stream. Check the URL and CORS policy.')));
                });
            }
        }

        async function startBroadcast() {
            currentRoomId = document.getElementById('room-id').value;
            broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;

            if (!currentRoomId) {
                alert('Please select a room first.');
                return;
            }

            try {
                localStream = await getCameraStream();
                switchToStreamingView();
                localVideo.srcObject = localStream;

                if (broadcastType === 'sfu') {
                    await startSfuBroadcast();
                } else {
                    await startMeshBroadcast();
                }
                await fetchAndRenderRooms();
            } catch (error) {
                alert(`Error: ${error.message}` || 'Could not start broadcast.');
                console.error(error);
                handleLeave();
            }
        }

        async function startMeshBroadcast() {
            if (!await initializeSignalR()) throw new Error('Failed to connect for mesh broadcast.');
            await signalRConnection.invoke('StartBroadcast', currentRoomId, 'mesh');
            statusDiv.textContent = `Waiting for viewers (Mesh): ${currentRoomId}`;
            startScreenShareBtn.classList.add('hidden');
            createPollBtn.classList.add('hidden');
        }

        async function startSfuBroadcast() {
            statusDiv.textContent = 'Initializing SFU broadcast...';
            try {
                const response = await fetch(`${API_URL}/api/broadcast/start/sfu/${currentRoomId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                if (!response.ok) throw new Error((await response.json()).message || 'Failed to initialize SFU broadcast.');
                const { liveKitUrl, token, username } = await response.json();
                myUsername = username;

                if (!await initializeSignalR()) {
                    throw new Error("Could not connect to the chat service.");
                }
                await signalRConnection.invoke('SubscribeToRoom', currentRoomId);

                livekitRoom = new LivekitClient.Room();
                setupLiveKitListeners();

                await livekitRoom.connect(liveKitUrl, token);
                console.log('--- BROADCASTER: Connected to LiveKit Room ---');
                statusDiv.textContent = `Broadcasting to room: ${currentRoomId} (SFU)`;

                if (localStream.getVideoTracks().length > 0) {
                    webcamPublication = await livekitRoom.localParticipant.publishTrack(localStream.getVideoTracks()[0], { name: 'camera' });
                }
                if (localStream.getAudioTracks().length > 0) {
                    await livekitRoom.localParticipant.publishTrack(localStream.getAudioTracks()[0]);
                }

                fetchAndRenderChatHistory(currentRoomId);
            } catch (error) {
                console.error('SFU broadcast failed:', error);
                throw error;
            }
        }

        async function initializeSignalR() {
            signalRConnection = new signalR.HubConnectionBuilder().withUrl(`${API_URL}/broadcasthub?access_token=${jwtToken}`).withAutomaticReconnect().build();

            signalRConnection.on('ReceiveChatMessage', (messageId, user, message) => displayChatMessage(messageId, user, message, user === myUsername));
            signalRConnection.on('MessageDeleted', (messageId) => { const msgElement = document.getElementById(`chat-msg-${messageId}`); if (msgElement) msgElement.remove(); });
            signalRConnection.on('BroadcastEnded', () => { alert('The broadcast has ended.'); handleLeave(); });

            if (broadcastType === 'mesh') {
                signalRConnection.on('UpdateViewerCount', (count) => { viewerCountNumber.textContent = count; });
                signalRConnection.on('NewViewer', async (viewerId) => {
                    const pc = createPeerConnection(viewerId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await signalRConnection.invoke('SendOfferToViewer', viewerId, offer);
                });
                signalRConnection.on('ReceiveAnswerFromViewer', async (answer, viewerId) => {
                    await peerConnections[viewerId]?.setRemoteDescription(new RTCSessionDescription(answer));
                });
                signalRConnection.on('ViewerLeft', (viewerId) => { peerConnections[viewerId]?.close(); delete peerConnections[viewerId]; });
            }

            try {
                await signalRConnection.start();
                console.log("Broadcaster SignalR Connected.");
                return true;
            } catch (error) {
                console.error("SignalR Connection Error: ", error);
                return false;
            }
        }

        function setupLiveKitListeners() {
            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                console.log('--- BROADCASTER: LiveKit Data Received ---', { topic, from: participant.identity });
                try {
                    const message = JSON.parse(new TextDecoder().decode(payload));
                    if (topic === 'reaction') {
                        showReaction(message.emoji);
                    } else if (topic === 'poll') {
                        handlePollMessage(message);
                    }
                } catch (e) {
                    console.error("Failed to parse incoming data payload:", e);
                }
            });

            livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, () => { viewerCountNumber.textContent = livekitRoom.numParticipants; });
            livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => { viewerCountNumber.textContent = livekitRoom.numParticipants; });
        }

        function createPeerConnection(peerId) {
            const pc = new RTCPeerConnection(iceServers);
            peerConnections[peerId] = pc;
            pc.onicecandidate = event => {
                if (event.candidate) signalRConnection.invoke('SendIceCandidate', peerId, event.candidate);
            };
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            return pc;
        }

        async function handleLeave() {
            if (livekitRoom || signalRConnection || Object.keys(peerConnections).length > 0) {
                if (currentEgressId) {
                    await handleStopRecording();
                }
                await handleScreenShare(false);
                if (livekitRoom) {
                    await livekitRoom.disconnect();
                    livekitRoom = null;
                }
                if (signalRConnection) {
                    await signalRConnection.stop();
                    signalRConnection = null;
                }
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    localStream = null;
                }
                Object.values(peerConnections).forEach(pc => pc.close());
                peerConnections = {};

                if (userRole === 'broadcaster' && broadcastType === 'sfu' && currentRoomId) {
                    try {
                        await fetch(`${API_URL}/api/broadcast/end/sfu/${currentRoomId}`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${jwtToken}` }
                        });
                    } catch (error) {
                        console.error('Error sending end signal:', error);
                    }
                }
                streamingSection.classList.add('hidden');
                broadcastDashboard.classList.remove('hidden');
                showRoomSelection();
                await fetchAndRenderRooms();
            }
        }

        async function handleScreenShare(enabled) {
            if (enabled) {
                try {
                    screenShareStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const screenTrack = screenShareStream.getVideoTracks()[0];
                    screenShareVideo.srcObject = screenShareStream;
                    screenShareContainer.classList.remove('hidden');

                    screenSharePublication = await livekitRoom.localParticipant.publishTrack(screenTrack, { name: 'screen', simulcast: true });
                    if (webcamPublication) {
                        await livekitRoom.localParticipant.unpublishTrack(webcamPublication.trackSid);
                    }

                    screenTrack.onended = () => handleScreenShare(false);
                    startScreenShareBtn.classList.add('hidden');
                    stopScreenShareBtn.classList.remove('hidden');
                    localVideoContainer.classList.add('hidden');
                } catch (error) {
                    console.error("Screen share failed:", error);
                    handleScreenShare(false);
                }
            } else {
                if (screenSharePublication && livekitRoom) {
                    await livekitRoom.localParticipant.unpublishTrack(screenSharePublication.trackSid);
                }
                if (screenShareStream) {
                    screenShareStream.getTracks().forEach(track => track.stop());
                }

                if (webcamPublication && livekitRoom && !livekitRoom.localParticipant.getTrackPublication(webcamPublication.source)) {
                    await livekitRoom.localParticipant.publishTrack(webcamPublication.track, {
                        name: 'camera',
                        simulcast: true
                    });
                }
                screenSharePublication = null;
                screenShareStream = null;
                if (streamingEventListenersInitialized) {
                    screenShareContainer.classList.add('hidden');
                    startScreenShareBtn.classList.remove('hidden');
                    stopScreenShareBtn.classList.add('hidden');
                    localVideoContainer.classList.remove('hidden');
                }
            }
        }

        async function handleRecording() {
            if (!currentRoomId) { alert("You must start a broadcast before you can record."); return; }

            recordBtn.disabled = true;
            recordBtn.textContent = 'Starting...';

            try {
                const response = await fetch(`${API_URL}/api/broadcast/record/start/${currentRoomId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to start recording.');

                alert(result.message);
                currentEgressId = result.egressId;

                recordBtn.classList.add('hidden');
                stopRecordBtn.classList.remove('hidden');

            } catch (error) {
                console.error('Recording error:', error);
                alert(`Could not start recording: ${error.message}`);
                recordBtn.disabled = false;
                recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> Start Recording';
            }
        }

        async function handleStopRecording() {
            if (!currentEgressId) {
                alert("No active recording to stop.");
                return;
            }

            stopRecordBtn.disabled = true;
            stopRecordBtn.textContent = 'Stopping...';

            try {
                const response = await fetch(`${API_URL}/api/broadcast/record/stop`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ egressId: currentEgressId })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to stop recording.');

                alert(result.message);
                currentEgressId = null;

                stopRecordBtn.classList.add('hidden');
                recordBtn.classList.remove('hidden');
                recordBtn.disabled = false;
                recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> Start Recording';

            } catch (error) {
                console.error('Stop recording error:', error);
                alert(`Could not stop recording: ${error.message}`);
            } finally {
                stopRecordBtn.disabled = false;
                stopRecordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
            }
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
            if (!text || !signalRConnection || signalRConnection.state !== 'Connected') return;

            try {
                await signalRConnection.invoke('SendChatMessage', currentRoomId, text);
                chatInput.value = '';
            } catch (err) {
                console.error("Chat send error:", err);
                alert("Could not send message. Connection may be lost.");
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
            usernameSpan.className = 'text-sm font-semibold text-white ml-[5px]';
            usernameSpan.textContent = isSelf ? "You" : user;
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = `<i class="fas fa-times-circle text-gray-500 hover:text-red-400"></i>`;
            deleteBtn.className = 'delete-msg-btn';
            deleteBtn.dataset.messageId = id;
            deleteBtn.onclick = () => handleDeleteMessage(id);
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble flex flex-col w-full max-w-xs p-2.5 rounded-lg' + (isSelf ? ' rounded-br-none bg-blue-700' : ' rounded-bl-none bg-gray-600');
            bubble.innerHTML = `<p class="text-sm font-normal text-white break-words">${message}</p>`;

            const isBroadcaster = userRole === 'broadcaster';
            const canDelete = isAdmin || isBroadcaster || isSelf;

            header.appendChild(usernameSpan);
            if (canDelete) {
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
            if (!signalRConnection || signalRConnection.state !== 'Connected') return;

            try {
                signalRConnection.invoke('DeleteMessage', currentRoomId, messageId);
            } catch (err) {
                console.error("Delete message error:", err);
                alert("Could not delete message.");
            }
        }

        function showReaction(emoji) {
            const container = screenShareStream ? document.getElementById('screen-reaction-container') : document.getElementById('camera-reaction-container');
            const reaction = document.createElement('span');
            reaction.className = 'reaction-emoji';
            reaction.textContent = emoji;
            reaction.style.setProperty('--tx', `${(Math.random() * 200) - 100}px`);
            reaction.style.setProperty('--rot', `${(Math.random() * 40) - 20}deg`);
            container.appendChild(reaction);
            setTimeout(() => reaction.remove(), 4000);
        }

        function openPollModal() { pollModal.classList.remove('hidden'); pollModal.classList.add('flex'); }
        function closePollModal() { pollModal.classList.add('hidden'); pollModal.classList.remove('flex'); }

        function addPollOption() {
            const container = document.getElementById('poll-options-container');
            if (container.children.length >= 5) { alert("Maximum of 5 options allowed."); return; }
            const newOption = document.createElement('div');
            newOption.innerHTML = `<label class="block text-sm font-medium text-gray-300 mb-1">Option ${container.children.length + 1}</label><input type="text" name="poll-option" required maxlength="100" class="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600">`;
            container.appendChild(newOption);
        }

        function handleCreatePoll(e) {
            e.preventDefault();
            const question = document.getElementById('poll-question').value;
            const optionInputs = document.querySelectorAll('input[name="poll-option"]');
            const options = Array.from(optionInputs).map((input, index) => ({ index: index, text: input.value, votes: 0 }));
            if (options.some(opt => !opt.text)) { alert("All poll options must have text."); return; }

            currentPoll = { id: `poll-${Date.now()}`, question: question, options: options };
            const payload = { type: 'poll_start', poll: currentPoll };
            const data = new TextEncoder().encode(JSON.stringify(payload));
            livekitRoom.localParticipant.publishData(data, { reliable: true, topic: 'poll' });

            displayPollResults();
            closePollModal();
            pollModalForm.reset();
        }

        function handlePollMessage(message) {
            if (!currentPoll || message.pollId !== currentPoll.id) return;
            if (message.type === 'poll_vote') {
                const option = currentPoll.options.find(o => o.index === message.optionIndex);
                if (option) {
                    option.votes += 1;
                    updatePollResults();
                    const payload = { type: 'poll_update', results: currentPoll.options };
                    const data = new TextEncoder().encode(JSON.stringify(payload));
                    livekitRoom.localParticipant.publishData(data, { reliable: true, topic: 'poll' });
                }
            }
        }

        function displayPollResults() {
            if (!currentPoll) return;
            pollResultsContainer.classList.remove('hidden');
            updatePollResults();
        }

        function updatePollResults() {
            const totalVotes = currentPoll.options.reduce((sum, opt) => sum + opt.votes, 0);
            let optionsHtml = currentPoll.options.map(option => {
                const percentage = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : 0;
                return `<div class="mb-2"><div class="flex justify-between items-center mb-1"><span class="text-sm font-medium text-gray-300">${option.text}</span><span class="text-sm font-bold text-white">${option.votes} votes (${percentage}%)</span></div><div class="w-full bg-gray-600 rounded-full h-4"><div class="bg-cyan-500 h-4 rounded-full poll-progress-bar" style="width: ${percentage}%"></div></div></div>`;
            }).join('');
            pollResultsContainer.innerHTML = `<h4 class="text-xl font-bold mb-3">${currentPoll.question}</h4>${optionsHtml}<p class="text-sm text-gray-400 mt-3">Total Votes: ${totalVotes}</p>`;
        }
    })();
});
