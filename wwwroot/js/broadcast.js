// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const roleSection = document.getElementById('role-section');
const streamingSection = document.getElementById('streaming-section');
const loginButton = document.getElementById('login-button');
const startBroadcastBtn = document.getElementById('start-broadcast-button');
const viewBroadcastBtn = document.getElementById('view-broadcast-button');
const leaveBtn = document.getElementById('leave-button');
const localVideoContainer = document.getElementById('local-video-container');
const remoteVideoContainer = document.getElementById('remote-video-container');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');
const roomIdInput = document.getElementById('room-id');

// --- Global State ---
let jwtToken;
let signalRConnection;
let localStream;
let peerConnections = {}; // For broadcaster: one PC per viewer
let currentRoomId;
let userRole; // 'broadcaster' or 'viewer'

// --- WebRTC Configuration ---
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// --- API and Hub URL ---
// IMPORTANT: Update with your actual port from launchSettings.json
//const API_URL = `https://localhost:${window.location.port || 44304}`;
const API_URL = 'https://b2twb5ss-44304.asse.devtunnels.ms'; // IMPORTANT: Update with your actual port

// --- Event Listeners ---
loginButton.addEventListener('click', handleLogin);
startBroadcastBtn.addEventListener('click', startBroadcast);
viewBroadcastBtn.addEventListener('click', viewBroadcast);
leaveBtn.addEventListener('click', () => window.location.reload());


// --- Functions ---

async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) throw new Error('Invalid credentials');
        const data = await response.json();
        jwtToken = data.token;
        loginSection.classList.add('hidden');
        roleSection.classList.remove('hidden');
    } catch (error) {
        loginError.textContent = 'Login failed. Please check your credentials.';
        console.error('Login failed:', error);
    }
}

async function initializeSignalR() {
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/broadcasthub?access_token=${jwtToken}`)
        .withAutomaticReconnect()
        .build();

    // --- Register SignalR event handlers ---

    // --- Broadcaster Handlers ---
    signalRConnection.on('NewViewer', async (viewerId) => {
        statusDiv.textContent = `New viewer joined. Setting up connection...`;
        console.log(`New viewer connected: ${viewerId}`);
        const pc = createPeerConnection(viewerId);
        // Broadcaster creates and sends the offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signalRConnection.invoke('SendOfferToViewer', viewerId, offer);
    });

    signalRConnection.on('ReceiveAnswerFromViewer', async (answer, viewerId) => {
        console.log(`Received answer from viewer: ${viewerId}`);
        const pc = peerConnections[viewerId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    signalRConnection.on('ViewerLeft', (viewerId) => {
        console.log(`Viewer left: ${viewerId}`);
        if (peerConnections[viewerId]) {
            peerConnections[viewerId].close();
            delete peerConnections[viewerId];
        }
    });

    // --- Viewer Handlers ---
    signalRConnection.on('ReceiveOfferFromBroadcaster', async (offer, broadcasterId) => {
        statusDiv.textContent = 'Receiving stream from broadcaster...';
        console.log('Received offer from broadcaster');
        const pc = createPeerConnection(broadcasterId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signalRConnection.invoke('SendAnswerToBroadcaster', broadcasterId, answer);
    });

    // --- Common Handlers ---
    signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
        console.log('Received ICE candidate');
        // This assumes a single peer connection for viewers, and finds the right one for broadcasters
        const pc = Object.values(peerConnections)[0]; // Simplified for viewer
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    });

    signalRConnection.on('BroadcastEnded', () => {
        alert('The broadcast has ended.');
        window.location.reload();
    });

    signalRConnection.on('NoBroadcastFound', () => {
        alert('Error: No broadcast found in this room.');
        switchToRoleSelection();
    });

    signalRConnection.on('BroadcastExists', () => {
        alert('Error: A broadcast is already active in this room.');
        switchToRoleSelection();
    });


    try {
        await signalRConnection.start();
        console.log('SignalR Connected.');
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
        if (event.candidate) {
            signalRConnection.invoke('SendIceCandidate', peerId, event.candidate);
        }
    };

    if (userRole === 'broadcaster') {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    } else { // viewer
        pc.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };
    }

    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            statusDiv.textContent = userRole === 'broadcaster' ? 'Broadcasting live!' : 'Connected to broadcast!';
        }
    };

    return pc;
}


async function startBroadcast() {
    userRole = 'broadcaster';
    currentRoomId = roomIdInput.value;
    if (!currentRoomId) {
        alert('Please enter a Room ID.');
        return;
    }

    if (!await initializeSignalR()) {
        alert('Failed to connect to server.');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        switchToStreamingView();
        await signalRConnection.invoke('StartBroadcast', currentRoomId);
        statusDiv.textContent = `Waiting for viewers in room: ${currentRoomId}`;
    } catch (error) {
        console.error('Could not start camera.', error);
        alert('Could not access camera. Please check permissions.');
    }
}

async function viewBroadcast() {
    userRole = 'viewer';
    currentRoomId = roomIdInput.value;
    if (!currentRoomId) {
        alert('Please enter a Room ID.');
        return;
    }

    if (!await initializeSignalR()) {
        alert('Failed to connect to server.');
        return;
    }

    switchToStreamingView();
    await signalRConnection.invoke('ViewBroadcast', currentRoomId);
    statusDiv.textContent = `Attempting to view broadcast in room: ${currentRoomId}`;
}

function switchToStreamingView() {
    roleSection.classList.add('hidden');
    streamingSection.classList.remove('hidden');
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
}
