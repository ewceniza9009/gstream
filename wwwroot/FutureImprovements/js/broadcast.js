document.addEventListener('DOMContentLoaded', () => {
    (async function () {
        let API_URL;

        // --- Core App State ---
        let jwtToken, myUsername, isAdmin, allRooms = [], currentRoomId;
        let signalRConnection, livekitRoom;

        // --- Broadcast Studio State ---
        let broadcastCanvas, canvasCtx, compositeStream, audioStream;
        let sources = [];
        let isBroadcasting = false;
        // **MODIFIED**: Switched from animationFrameId to drawIntervalId
        let drawIntervalId;

        // --- NEW: Adaptive Quality & Performance ---
        const qualityPresets = [
            { name: '720p', width: 1280, height: 720, fps: 24 }, // High
            { name: '540p', width: 960, height: 540, fps: 20 }, // Medium
            { name: '360p', width: 640, height: 360, fps: 15 }  // Low
        ];
        let currentQualityLevel = 0; // Index of the current preset
        let performanceMonitorId;
        let frameRenderTimes = []; // To track performance

        // ... (UI Element References are unchanged) ...
        const loginSection = document.getElementById('login-section');
        const broadcastDashboard = document.getElementById('broadcast-dashboard');
        const roomSelectionSection = document.getElementById('room-selection-section');
        const configureSection = document.getElementById('configure-section');
        const loginButton = document.getElementById('login-button');
        const registerButton = document.getElementById('register-button');
        const logoutButton = document.getElementById('logout-button');
        const adminLink = document.getElementById('admin-link');
        const roomSearchInput = document.getElementById('room-search-input');
        const roomList = document.getElementById('room-list');
        const backToRoomsBtn = document.getElementById('back-to-rooms-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginHeader = document.getElementById('login-header');
        const dashboardHeader = document.getElementById('dashboard-header');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const goToStudioBtn = document.getElementById('go-to-studio-button');
        const streamingSection = document.getElementById('streaming-section');
        const statusDiv = document.getElementById('status');
        const viewerCountNumber = document.getElementById('viewer-count-number');
        const recordBtn = document.getElementById('record-button');
        const leaveBtn = document.getElementById('leave-button');
        const startBroadcastBtn = document.getElementById('start-broadcast-button');
        const createPollBtn = document.getElementById('create-poll-button');
        const pollModal = document.getElementById('poll-modal');
        const pollModalForm = document.getElementById('poll-modal-form');
        const closePollModalBtn = document.getElementById('close-poll-modal-btn');
        const addPollOptionBtn = document.getElementById('add-poll-option-btn');
        const pollResultsContainer = document.getElementById('poll-results-container');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const chatSendButton = document.getElementById('chat-send-button');
        const videoInputSelect = document.getElementById('video-input-select');
        const audioInputSelect = document.getElementById('audio-input-select');
        const addWebcamBtn = document.getElementById('add-webcam-btn');
        const addScreenshareBtn = document.getElementById('add-screenshare-btn');
        const ipCameraUrlInput = document.getElementById('ip-camera-url');
        const addIpCameraBtn = document.getElementById('add-ip-camera-btn');
        const activeSourcesList = document.getElementById('active-sources-list');

        // ... (Initialization and Core Logic functions are unchanged) ...
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

        initializeApplicationState();
        addCoreEventListeners();

        function addCoreEventListeners() {
            loginButton.addEventListener('click', handleLogin);
            registerButton.addEventListener('click', handleRegister);
            logoutButton.addEventListener('click', handleLogout);
            roomSearchInput.addEventListener('input', handleSearch);
            backToRoomsBtn.addEventListener('click', showRoomSelection);
            goToStudioBtn.addEventListener('click', switchToStreamingView);
            showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(false); });
            showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(true); });
        }

        function toggleAuthForms(showLogin) {
            loginForm.classList.toggle('hidden', !showLogin);
            registerForm.classList.toggle('hidden', showLogin);
        }

        function parseJwt(token) {
            try { return JSON.parse(atob(token.split('.')[1])); }
            catch (e) { return null; }
        }

        function updateNav() {
            if (!jwtToken) return;
            const decodedToken = parseJwt(jwtToken);
            isAdmin = decodedToken && decodedToken.role === 'Admin';
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
                await postLoginSetup();
            } catch (error) {
                loginError.textContent = `Login failed: ${error.message}`;
            }
        }

        function initializeApplicationState() {
            jwtToken = localStorage.getItem('jwtToken');
            myUsername = localStorage.getItem('myUsername');
            if (jwtToken && myUsername) {
                postLoginSetup();
            }
        }

        async function postLoginSetup() {
            loginHeader.classList.add('hidden');
            loginSection.classList.add('hidden');
            dashboardHeader.classList.remove('hidden');
            const decodedToken = parseJwt(jwtToken);
            if (decodedToken && decodedToken.role === 'Consumer') {
                broadcastDashboard.innerHTML = `<div class="text-center p-8 bg-gray-800 rounded-lg"><h3 class="text-2xl font-semibold text-yellow-400">Access Denied</h3><p class="text-gray-300 mt-2">Your account does not have permission to broadcast.</p></div>`;
                broadcastDashboard.classList.remove('hidden');
            } else {
                broadcastDashboard.classList.remove('hidden');
                await fetchAndRenderRooms();
            }
            updateNav();
        }

        // --- MODIFIED handleLeave ---
        async function handleLeave() {
            const wasBroadcastingSfu = isBroadcasting && document.querySelector('input[name="broadcastType"]:checked').value === 'sfu';

            isBroadcasting = false;
            // Clear the drawing and monitoring intervals
            if (drawIntervalId) clearInterval(drawIntervalId);
            if (performanceMonitorId) clearInterval(performanceMonitorId);
            drawIntervalId = null;
            performanceMonitorId = null;

            if (livekitRoom) await livekitRoom.disconnect();
            if (signalRConnection) await signalRConnection.stop();
            // ... (rest is unchanged)
            livekitRoom = null;
            signalRConnection = null;

            sources.forEach(source => {
                source.stream?.getTracks().forEach(track => track.stop());
                source.container?.remove();
            });
            sources = [];

            if (compositeStream) compositeStream.getTracks().forEach(track => track.stop());
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());

            if (wasBroadcastingSfu && currentRoomId) {
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

        // ... (Room Management functions are unchanged) ...
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
        }

        async function fetchAndRenderRooms() {
            roomList.innerHTML = '<p class="text-gray-400 col-span-full text-center">Loading rooms...</p>';
            try {
                const response = await fetch(`${API_URL}/api/rooms`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
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

        // ... (Studio Initialization functions are unchanged) ...
        function switchToStreamingView() {
            currentRoomId = document.getElementById('room-id').value;
            if (!currentRoomId) {
                alert('Please select a room first.');
                return;
            }
            broadcastDashboard.classList.add('hidden');
            streamingSection.classList.remove('hidden');
            initializeStudio();
        }

        function initializeStudio() {
            broadcastCanvas = document.createElement('canvas');
            broadcastCanvas.width = 1920;
            broadcastCanvas.height = 1080;
            canvasCtx = broadcastCanvas.getContext('2d');
            canvasCtx.fillStyle = 'black';
            canvasCtx.fillRect(0, 0, broadcastCanvas.width, broadcastCanvas.height);

            populateDeviceLists();
            initializeInteractJs();
            addStudioEventListeners();

            statusDiv.textContent = `Studio Ready for: ${currentRoomId}. Add sources and click 'Start Broadcast'.`;
        }

        function addStudioEventListeners() {
            addWebcamBtn.addEventListener('click', addWebcamSource);
            addScreenshareBtn.addEventListener('click', addScreenShareSource);
            addIpCameraBtn.addEventListener('click', addIpCameraSource);
            startBroadcastBtn.addEventListener('click', startBroadcast);
            leaveBtn.addEventListener('click', handleLeave);
            recordBtn.addEventListener('click', handleRecord);

            createPollBtn.addEventListener('click', openPollModal);
            closePollModalBtn.addEventListener('click', closePollModal);
            pollModalForm.addEventListener('submit', handleCreatePoll);
            addPollOptionBtn.addEventListener('click', addPollOption);
            chatSendButton.addEventListener('click', sendChatMessage);
            chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
        }

        async function populateDeviceLists() {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                videoInputSelect.innerHTML = '';
                audioInputSelect.innerHTML = '';
                devices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `${device.kind} device ${videoInputSelect.length + 1}`;
                    if (device.kind === 'videoinput') {
                        videoInputSelect.appendChild(option);
                    } else if (device.kind === 'audioinput') {
                        audioInputSelect.appendChild(option);
                    }
                });
            } catch (err) {
                console.error("Error enumerating devices:", err);
                alert("Could not access camera or microphone. Please check permissions.");
            }
        }

        function initializeInteractJs() {
            interact('.source-item').draggable({
                listeners: {
                    move(event) {
                        const target = event.target;
                        const source = sources.find(s => s.id === target.dataset.sourceId);
                        if (!source) return;
                        source.x = (source.x || 0) + event.dx;
                        source.y = (source.y || 0) + event.dy;
                        target.style.transform = `translate(${source.x}px, ${source.y}px)`;
                    }
                },
                modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })]
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move(event) {
                        const target = event.target;
                        const source = sources.find(s => s.id === target.dataset.sourceId);
                        if (!source) return;
                        source.width = event.rect.width;
                        source.height = event.rect.height;
                        source.x += event.deltaRect.left;
                        source.y += event.deltaRect.top;
                        Object.assign(target.style, {
                            width: `${source.width}px`,
                            height: `${source.height}px`,
                            transform: `translate(${source.x}px, ${source.y}px)`
                        });
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({ min: { width: 100, height: 50 } }),
                    interact.modifiers.aspectRatio({ ratio: 'preserve' }),
                ]
            });
        }

        // --- MODIFIED drawCanvas ---
        function drawCanvas() {
            const startTime = performance.now();
            if (!isBroadcasting) return;

            canvasCtx.fillStyle = 'black';
            canvasCtx.fillRect(0, 0, broadcastCanvas.width, broadcastCanvas.height);

            const sortedSources = [...sources].sort((a, b) => a.zIndex - b.zIndex);

            sortedSources.forEach(source => {
                if (source.videoElement && source.isVisible && source.videoElement.readyState >= 2) {
                    const stage = document.getElementById('broadcast-canvas');
                    const stageRect = stage.getBoundingClientRect();
                    const scaleX = broadcastCanvas.width / stageRect.width;
                    const scaleY = broadcastCanvas.height / stageRect.height;
                    const canvasX = source.x * scaleX;
                    const canvasY = source.y * scaleY;
                    const canvasWidth = source.width * scaleX;
                    const canvasHeight = source.height * scaleY;
                    canvasCtx.drawImage(source.videoElement, canvasX, canvasY, canvasWidth, canvasHeight);
                }
            });

            // Store the render time for the performance monitor
            const renderTime = performance.now() - startTime;
            frameRenderTimes.push(renderTime);
        }

        // ... (Source Management functions are unchanged) ...
        async function addSource(type, streamPromise) {
            try {
                const stream = await streamPromise;
                if (!stream) throw new Error("Stream could not be created.");

                const sourceId = `${type}-${Date.now()}`;
                const stage = document.getElementById('broadcast-canvas');

                const container = document.createElement('div');
                container.className = 'source-item';
                container.dataset.sourceId = sourceId;
                container.dataset.sourceType = type;

                const videoElement = document.createElement('video');
                videoElement.srcObject = stream;
                videoElement.muted = true;
                videoElement.play().catch(e => console.error(`Error playing video for source ${sourceId}:`, e));
                container.appendChild(videoElement);

                stage.appendChild(container);

                const source = {
                    id: sourceId, type, stream, videoElement, container, isVisible: true,
                    x: 20, y: 20, width: 480, height: 270,
                    zIndex: sources.length + 1
                };

                Object.assign(container.style, {
                    width: `${source.width}px`, height: `${source.height}px`,
                    transform: `translate(${source.x}px, ${source.y}px)`,
                    zIndex: source.zIndex
                });

                sources.push(source);
                updateActiveSourcesList();

            } catch (err) {
                console.error(`Failed to add ${type} source:`, err);
                alert(`Could not add ${type} source. ${err.message}`);
            }
        }

        function addWebcamSource() {
            const videoId = videoInputSelect.value;
            addSource('webcam', navigator.mediaDevices.getUserMedia({
                video: { deviceId: videoId ? { exact: videoId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } },
            }));
        }

        function addScreenShareSource() {
            addSource('screenshare', navigator.mediaDevices.getDisplayMedia({ video: true }));
        }

        function addIpCameraSource() {
            const url = ipCameraUrlInput.value;
            if (!url) {
                alert('Please enter an IP Camera stream URL.');
                return;
            }
            const streamPromise = new Promise((resolve, reject) => {
                const ipVideoElement = document.createElement('video');
                ipVideoElement.crossOrigin = 'anonymous';
                ipVideoElement.src = url;
                ipVideoElement.addEventListener('loadeddata', () => {
                    ipVideoElement.play().then(() => {
                        const stream = ipVideoElement.captureStream ? ipVideoElement.captureStream() : null;
                        if (stream) resolve(stream);
                        else reject(new Error('captureStream API is not supported.'));
                    }).catch(e => reject(new Error(`Could not play the IP Camera stream. Error: ${e.message}`)));
                });
                ipVideoElement.addEventListener('error', (e) => reject(new Error(`Could not load IP Camera stream. Check URL and CORS policy.`)));
            });
            addSource('ip-camera', streamPromise);
            ipCameraUrlInput.value = '';
        }

        function updateActiveSourcesList() {
            activeSourcesList.innerHTML = '';
            if (sources.length === 0) {
                activeSourcesList.innerHTML = '<p class="text-gray-400 text-center text-sm">No active sources.</p>';
                return;
            }

            sources.forEach(source => {
                const item = document.createElement('div');
                item.className = 'bg-gray-700 p-2 rounded-md flex items-center justify-between';
                item.innerHTML = `
                    <span class="text-sm font-medium truncate">${source.id}</span>
                    <div class="flex items-center gap-2">
                        <button data-id="${source.id}" class="toggle-visibility-btn">${source.isVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'}</button>
                        <button data-id="${source.id}" class="z-up-btn"><i class="fas fa-arrow-up"></i></button>
                        <button data-id="${source.id}" class="z-down-btn"><i class="fas fa-arrow-down"></i></button>
                        <button data-id="${source.id}" class="remove-source-btn text-red-400"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                activeSourcesList.appendChild(item);
            });

            document.querySelectorAll('.remove-source-btn').forEach(btn => btn.onclick = () => removeSource(btn.dataset.id));
            document.querySelectorAll('.toggle-visibility-btn').forEach(btn => btn.onclick = () => toggleSourceVisibility(btn.dataset.id));
            document.querySelectorAll('.z-up-btn').forEach(btn => btn.onclick = () => changeZIndex(btn.dataset.id, 1));
            document.querySelectorAll('.z-down-btn').forEach(btn => btn.onclick = () => changeZIndex(btn.dataset.id, -1));
        }

        function removeSource(sourceId) {
            const index = sources.findIndex(s => s.id === sourceId);
            if (index > -1) {
                const source = sources[index];
                source.stream.getTracks().forEach(track => track.stop());
                source.container.remove();
                sources.splice(index, 1);
                updateActiveSourcesList();
            }
        }

        function toggleSourceVisibility(sourceId) {
            const source = sources.find(s => s.id === sourceId);
            if (source) {
                source.isVisible = !source.isVisible;
                source.container.style.display = source.isVisible ? 'flex' : 'none';
                updateActiveSourcesList();
            }
        }

        function changeZIndex(sourceId, direction) {
            const source = sources.find(s => s.id === sourceId);
            if (source) {
                source.zIndex += direction;
                if (source.zIndex < 1) source.zIndex = 1;
                source.container.style.zIndex = source.zIndex;
                updateActiveSourcesList();
            }
        }

        /**
        * Adjusts the broadcast quality up or down the preset list.
        * @param {'down' | 'up'} direction The direction to adjust quality.
        */
        function adjustQuality(direction) {
            const originalLevel = currentQualityLevel;

            if (direction === 'down' && currentQualityLevel < qualityPresets.length - 1) {
                currentQualityLevel++;
            } else if (direction === 'up' && currentQualityLevel > 0) {
                currentQualityLevel--;
            }

            if (originalLevel === currentQualityLevel) {
                return; // No change needed
            }

            const newQuality = qualityPresets[currentQualityLevel];
            console.warn(`System under stress. Adjusting quality down to ${newQuality.name} (${newQuality.fps}fps).`);
            statusDiv.textContent = `Performance Alert: Quality adjusted to ${newQuality.name} for a smoother stream.`;

            // 1. Resize the canvas
            broadcastCanvas.width = newQuality.width;
            broadcastCanvas.height = newQuality.height;

            // 2. Restart the drawing loop with the new frame rate
            if (drawIntervalId) clearInterval(drawIntervalId);
            drawIntervalId = setInterval(drawCanvas, 1000 / newQuality.fps);
        }

        /**
         * Starts a monitor that checks performance and adjusts quality if needed.
         */
        function startPerformanceMonitor() {
            if (performanceMonitorId) clearInterval(performanceMonitorId);

            performanceMonitorId = setInterval(() => {
                if (frameRenderTimes.length === 0) return;

                const avgRenderTime = frameRenderTimes.reduce((a, b) => a + b, 0) / frameRenderTimes.length;
                frameRenderTimes = []; // Reset for the next interval

                const currentQuality = qualityPresets[currentQualityLevel];
                const targetFrameTime = 1000 / currentQuality.fps;

                // If average render time is 25% higher than our target, the system is struggling.
                if (avgRenderTime > targetFrameTime * 1.25) {
                    adjustQuality('down');
                }

                // Note: Logic to automatically scale quality *up* could be added here,
                // but it's often better to avoid this to prevent quality fluctuations.

            }, 3000); // Check performance every 3 seconds
        }

        // --- MODIFIED startBroadcast ---
        async function startBroadcast() {
            if (isBroadcasting) {
                alert("Broadcast is already running."); return;
            }
            if (sources.filter(s => s.type !== 'audio').length === 0) {
                alert("Please add at least one video source before broadcasting."); return;
            }

            try {
                isBroadcasting = true;

                const quality = qualityPresets[currentQualityLevel];
                const frameRate = quality.fps;

                // Start the drawing and performance monitoring loops
                drawIntervalId = setInterval(drawCanvas, 1000 / frameRate);
                startPerformanceMonitor();

                const videoStream = broadcastCanvas.captureStream(frameRate);

                const audioDeviceId = audioInputSelect.value;
                audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined }
                });

                const audioTrack = audioStream.getAudioTracks()[0];
                videoStream.addTrack(audioTrack);
                compositeStream = videoStream;

                startBroadcastBtn.textContent = "Broadcasting...";
                startBroadcastBtn.disabled = true;
                recordBtn.disabled = false;

                const broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;
                if (broadcastType === 'sfu') {
                    await startSfuBroadcast();
                } else {
                    await startMeshBroadcast();
                }

                await fetchAndRenderRooms();

            } catch (error) {
                alert(`Could not start broadcast: ${error.message}`);
                console.error("Broadcast start failed:", error);
                handleLeave();
            }
        }

        // ... (Remaining functions like startSfuBroadcast, Chat, Polls, etc., are unchanged) ...
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
                livekitRoom = new LivekitClient.Room();

                addLiveKitEventListeners();

                await livekitRoom.connect(liveKitUrl, token);
                statusDiv.textContent = `Broadcasting to room: ${currentRoomId} (SFU)`;

                if (compositeStream.getVideoTracks().length > 0) {
                    await livekitRoom.localParticipant.publishTrack(compositeStream.getVideoTracks()[0], { name: 'camera', simulcast: true });
                }
                if (compositeStream.getAudioTracks().length > 0) {
                    await livekitRoom.localParticipant.publishTrack(compositeStream.getAudioTracks()[0]);
                }

                fetchAndRenderChatHistory(currentRoomId);

            } catch (error) {
                console.error('SFU broadcast failed:', error);
                throw error;
            }
        }

        async function startMeshBroadcast() {
            if (!await initializeSignalR()) throw new Error('Failed to connect for mesh broadcast.');
            await signalRConnection.invoke('StartBroadcast', currentRoomId, 'mesh');
            statusDiv.textContent = `Waiting for viewers (Mesh): ${currentRoomId}`;
        }

        function addLiveKitEventListeners() {
            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                try {
                    const message = JSON.parse(new TextDecoder().decode(payload));
                    if (topic === 'chat') {
                        if (message.username !== myUsername) {
                            displayChatMessage(message.id, message.username, message.content, false);
                        }
                    } else if (topic === 'moderation' && message.action === 'delete') {
                        const msgElement = document.getElementById(`chat-msg-${message.id}`);
                        if (msgElement) msgElement.remove();
                    } else if (topic === 'poll') {
                        handlePollMessage(message);
                    }
                } catch (e) {
                    console.error("Failed to parse incoming data payload:", e);
                }
            });
            livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, () => viewerCountNumber.textContent = livekitRoom.numParticipants);
            livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => viewerCountNumber.textContent = livekitRoom.numParticipants);
            livekitRoom.on(LivekitClient.RoomEvent.Disconnected, () => handleLeave());
        }

        async function initializeSignalR() {
            signalRConnection = new signalR.HubConnectionBuilder().withUrl(`${API_URL}/broadcasthub?access_token=${jwtToken}`).withAutomaticReconnect().build();
            let peerConnections = {};

            signalRConnection.on('NewViewer', async (viewerId) => {
                const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                peerConnections[viewerId] = pc;
                pc.onicecandidate = event => {
                    if (event.candidate) signalRConnection.invoke('SendIceCandidate', viewerId, event.candidate);
                };
                compositeStream.getTracks().forEach(track => pc.addTrack(track, compositeStream));
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
            signalRConnection.on('UpdateViewerCount', (count) => viewerCountNumber.textContent = count);
            signalRConnection.on('MessageDeleted', (messageId) => {
                const msgElement = document.getElementById(`chat-msg-${messageId}`);
                if (msgElement) msgElement.remove();
            });

            try {
                await signalRConnection.start();
                return true;
            } catch (error) {
                return false;
            }
        }

        async function handleRecord() {
            if (!currentRoomId || !isBroadcasting) {
                alert("You must be broadcasting to record."); return;
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
                recordBtn.innerHTML = '<i class="fas fa-record-vinyl text-red-500 animate-spin"></i> Recording...';
            } catch (error) {
                console.error('Recording error:', error);
                alert(`Could not start recording: ${error.message}`);
            }
        }

        async function fetchAndRenderChatHistory(roomId) {
            chatMessages.innerHTML = '';
            try {
                const response = await fetch(`${API_URL}/api/rooms/${roomId}/chat`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (!response.ok) return;
                const history = await response.json();
                history.forEach(msg => displayChatMessage(msg.id, msg.username, msg.content, msg.username === myUsername));
            } catch (e) {
                console.error("Could not fetch chat history", e);
            }
        }

        async function sendChatMessage() {
            const text = chatInput.value;
            if (!text || !isBroadcasting) return;
            chatInput.value = '';

            const broadcastType = document.querySelector('input[name="broadcastType"]:checked').value;

            if (broadcastType === 'mesh' && signalRConnection) {
                signalRConnection.invoke('SendChatMessage', currentRoomId, text);
                return;
            }

            if (broadcastType === 'sfu' && livekitRoom) {
                let payload;
                try {
                    const response = await fetch(`${API_URL}/api/rooms/${currentRoomId}/chat`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Content: text })
                    });
                    if (response.ok) {
                        payload = await response.json();
                        const data = new TextEncoder().encode(JSON.stringify(payload));
                        await livekitRoom.localParticipant.publishData(data, { reliable: true, topic: 'chat' });
                        displayChatMessage(payload.id, payload.username, payload.content, true);
                    } else {
                        console.warn('Could not save chat message to history.');
                    }
                } catch (error) {
                    console.error("API call to save chat message failed:", error);
                }
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

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble flex flex-col w-full max-w-xs p-2.5 rounded-lg' + (isSelf ? ' rounded-br-none bg-blue-700' : ' rounded-bl-none bg-gray-600');
            bubble.innerHTML = `<p class="text-sm font-normal text-white break-words">${message}</p>`;

            header.appendChild(usernameSpan);
            if (isAdmin || myUsername === user) {
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = `<i class="fas fa-times-circle text-gray-500 hover:text-red-400"></i>`;
                deleteBtn.className = 'delete-msg-btn';
                deleteBtn.dataset.messageId = id;
                deleteBtn.onclick = () => handleDeleteMessage(id);
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
                const data = new TextEncoder().encode(JSON.stringify({
                    action: 'delete',
                    id: messageId
                }));
                livekitRoom.localParticipant.publishData(data, {
                    reliable: true,
                    topic: 'moderation'
                });
                const msgElement = document.getElementById(`chat-msg-${messageId}`);
                if (msgElement) msgElement.remove();
                const response = fetch(`${API_URL}/api/rooms/chat/${messageId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else if (broadcastType === 'mesh' && signalRConnection) {
                signalRConnection.invoke('DeleteMessage', currentRoomId, messageId).catch(err => console.error(err));
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

        function openPollModal() {
            pollModal.classList.remove('hidden');
            pollModal.classList.add('flex');
        }

        function closePollModal() {
            pollModal.classList.add('hidden');
            pollModal.classList.remove('flex');
        }

        function addPollOption() {
            const container = document.getElementById('poll-options-container');
            if (container.children.length >= 5) {
                alert("Maximum of 5 options allowed.");
                return;
            }
            const newOption = document.createElement('div');
            newOption.innerHTML = `<label class="block text-sm font-medium text-gray-300 mb-1">Option ${container.children.length + 1}</label><input type="text" name="poll-option" required maxlength="100" class="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600">`;
            container.appendChild(newOption);
        }

        function handleCreatePoll(e) {
            e.preventDefault();
            const question = document.getElementById('poll-question').value;
            const optionInputs = document.querySelectorAll('input[name="poll-option"]');
            const options = Array.from(optionInputs).map((input, index) => ({
                index: index,
                text: input.value,
                votes: 0
            }));
            if (options.some(opt => !opt.text)) {
                alert("All poll options must have text.");
                return;
            }
            currentPoll = {
                id: `poll-${Date.now()}`,
                question: question,
                options: options
            };
            const payload = {
                type: 'poll_start',
                poll: currentPoll
            };
            const data = new TextEncoder().encode(JSON.stringify(payload));
            livekitRoom.localParticipant.publishData(data, {
                reliable: true,
                topic: 'poll'
            });
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
                    const payload = {
                        type: 'poll_update',
                        results: currentPoll.options
                    };
                    const data = new TextEncoder().encode(JSON.stringify(payload));
                    livekitRoom.localParticipant.publishData(data, {
                        reliable: true,
                        topic: 'poll'
                    });
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
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Username: username,
                        Password: password
                    })
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
});