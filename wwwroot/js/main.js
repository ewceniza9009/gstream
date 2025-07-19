// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const streamingSection = document.getElementById('streaming-section');
const loginButton = document.getElementById('login-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const joinRoomButton = document.getElementById('join-room-button');
const leaveRoomButton = document.getElementById('leave-room-button');
const roomIdInput = document.getElementById('room-id');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');

// --- Global State ---
let localStream;
let remoteStream;
let peerConnection;
let signalRConnection;
let jwtToken;
let currentRoomId;

// --- WebRTC Configuration ---
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// --- API and Hub URL ---
//const API_URL = 'https://localhost:44304'; // IMPORTANT: Update with your actual port
const API_URL = 'https://b2twb5ss-44304.asse.devtunnels.ms'; // IMPORTANT: Update with your actual port

// --- Event Listeners ---
loginButton.addEventListener('click', handleLogin);
joinRoomButton.addEventListener('click', joinRoom);
leaveRoomButton.addEventListener('click', leaveRoom);

// --- Functions ---

/**
 * Handles the login process.
 */
async function handleLogin() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    loginError.textContent = '';

    if (!username || !password) {
        loginError.textContent = 'Please enter username and password.';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        const data = await response.json();
        jwtToken = data.token;

        // Switch to streaming view
        loginSection.classList.add('hidden');
        streamingSection.classList.remove('hidden');

        // Initialize SignalR connection after successful login
        await initializeSignalR();
    } catch (error) {
        console.error('Login failed:', error);
        loginError.textContent = 'Login failed. Please check your credentials.';
    }
}

/**
 * Initializes the SignalR connection.
 */
async function initializeSignalR() {
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/streaminghub?access_token=${jwtToken}`)
        .withAutomaticReconnect()
        .build();

    // --- Register SignalR event handlers ---
    signalRConnection.on('UserJoined', async (connectionId) => {
        statusDiv.textContent = 'Another user joined. Creating offer...';
        console.log('User joined:', connectionId);
        await createOffer();
    });

    signalRConnection.on('ReceiveOffer', async (offer) => {
        statusDiv.textContent = 'Received offer. Creating answer...';
        console.log('Received offer');
        await createAnswer(offer);
    });

    signalRConnection.on('ReceiveAnswer', async (answer) => {
        statusDiv.textContent = 'Received answer. Connection should be established.';
        console.log('Received answer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    signalRConnection.on('ReceiveIceCandidate', (candidate) => {
        console.log('Received ICE candidate');
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    signalRConnection.on('UserLeft', (connectionId) => {
        statusDiv.textContent = 'The other user has left the room.';
        console.log('User left:', connectionId);
        resetStreamingState();
    });

    signalRConnection.on('RoomFull', () => {
        statusDiv.textContent = 'Error: This room is already full.';
        alert('This room is full. Please try a different Room ID.');
    });

    try {
        await signalRConnection.start();
        console.log('SignalR Connected.');
    } catch (error) {
        console.error('SignalR Connection Error: ', error);
        statusDiv.textContent = 'Failed to connect to the server.';
    }
}


/**
 * Joins a room and starts the local media stream.
 */
async function joinRoom() {
    currentRoomId = roomIdInput.value;
    if (!currentRoomId) {
        alert('Please enter a Room ID.');
        return;
    }

    statusDiv.textContent = `Joining room: ${currentRoomId}...`;

    try {
        // Get local camera stream
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        // Join the SignalR group
        await signalRConnection.invoke('JoinRoom', currentRoomId);
        console.log(`Joined room: ${currentRoomId}`);

        // Update UI
        joinRoomButton.classList.add('hidden');
        leaveRoomButton.classList.remove('hidden');
        roomIdInput.disabled = true;

        // Initialize the peer connection
        initializePeerConnection();

    } catch (error) {
        console.error('Error joining room or getting media:', error);
        statusDiv.textContent = 'Could not start camera or join room.';
    }
}

/**
 * Initializes the RTCPeerConnection object.
 */
function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle incoming ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            signalRConnection.invoke('SendIceCandidate', currentRoomId, event.candidate);
        }
    };

    // Handle incoming remote stream
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
        remoteStream = event.streams[0];
    };
}


/**
 * Creates a WebRTC offer and sends it to the other peer.
 */
async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await signalRConnection.invoke('SendOffer', currentRoomId, offer);
        console.log('Offer sent.');
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

/**
 * Creates a WebRTC answer to a received offer.
 */
async function createAnswer(offer) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await signalRConnection.invoke('SendAnswer', currentRoomId, answer);
        console.log('Answer sent.');
    } catch (error) {
        console.error('Error creating answer:', error);
    }
}

/**
 * Leaves the current room and cleans up resources.
 */
async function leaveRoom() {
    if (signalRConnection) {
        await signalRConnection.invoke('LeaveRoom', currentRoomId);
    }

    resetStreamingState();

    // Stop local media tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
        localStream = null;
    }

    // Update UI
    joinRoomButton.classList.remove('hidden');
    leaveRoomButton.classList.add('hidden');
    roomIdInput.disabled = false;
    roomIdInput.value = '';
    statusDiv.textContent = 'You have left the room.';
    currentRoomId = null;
}

/**
 * Resets the streaming state without stopping local media.
 */
function resetStreamingState() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
    }
}
