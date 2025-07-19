// --- DOM Elements ---
const apiKeySection = document.getElementById('api-key-section');
const streamingSection = document.getElementById('streaming-section');
const joinStreamBtn = document.getElementById('join-stream-button');
const leaveBtn = document.getElementById('leave-button');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');
const roomIdInput = document.getElementById('room-id');
const apiKeyInput = document.getElementById('api-key');


// --- Global State ---
let signalRConnection;
let peerConnection;
let currentRoomId;

// --- WebRTC Configuration ---
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// --- API URL ---
//const API_URL = `https://localhost:${window.location.port || 44304}`;
const API_URL = 'https://b2twb5ss-44304.asse.devtunnels.ms';

// --- Event Listeners ---
joinStreamBtn.addEventListener('click', handleJoinStream);
leaveBtn.addEventListener('click', () => window.location.reload());

// --- Main Functions ---

/**
 * 1. Call the API using the API Key to get connection details.
 */
async function handleJoinStream() {
    currentRoomId = roomIdInput.value;
    const apiKey = apiKeyInput.value;

    if (!currentRoomId || !apiKey) {
        alert('Please enter both an API Key and a Room ID.');
        return;
    }

    switchToStreamingView();
    statusDiv.textContent = `Searching for broadcast in room: ${currentRoomId}...`;

    try {
        const response = await fetch(`${API_URL}/api/broadcast/join/${currentRoomId}`, {
            method: 'GET',
            headers: {
                // Send the API Key in the 'X-Api-Key' header.
                'X-Api-Key': apiKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Could not find broadcast. Check API Key or Room ID.');
        }

        const connectionDetails = await response.json();
        statusDiv.textContent = 'Broadcast found! Connecting...';

        // 2. Use the temporary token from the API to connect to SignalR and WebRTC
        await connectToStream(connectionDetails);

    } catch (error) {
        console.error('Error joining stream:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        // Hide streaming view on error
        streamingSection.classList.add('hidden');
        apiKeySection.classList.remove('hidden');
    }
}

/**
 * 2. Connect to the SignalR hub using the temporary token.
 */
async function connectToStream(details) {
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(details.signalRHubUrl, {
            // Use the temporary token provided by the API for this connection.
            accessTokenFactory: () => details.token
        })
        .withAutomaticReconnect()
        .build();

    // --- Register SignalR event handlers ---
    signalRConnection.on('ReceiveOfferFromBroadcaster', async (offer, broadcasterId) => {
        console.log('Received offer from broadcaster');
        peerConnection = createPeerConnection(broadcasterId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await signalRConnection.invoke('SendAnswerToBroadcaster', broadcasterId, answer);
    });

    signalRConnection.on('ReceiveIceCandidate', async (candidate) => {
        console.log('Received ICE candidate');
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    });

    signalRConnection.on('BroadcastEnded', () => {
        alert('The broadcast has ended.');
        window.location.reload();
    });

    try {
        await signalRConnection.start();
        console.log('SignalR Connected.');
        // Tell the hub we want to view the broadcast
        await signalRConnection.invoke('ViewBroadcast', currentRoomId);
    } catch (error) {
        console.error('SignalR Connection Error: ', error);
        statusDiv.textContent = 'Failed to connect to the streaming server.';
    }
}

function createPeerConnection(broadcasterId) {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = event => {
        if (event.candidate) {
            signalRConnection.invoke('SendIceCandidate', broadcasterId, event.candidate);
        }
    };
    pc.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with broadcaster: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            statusDiv.textContent = 'Live stream connected!';
        }
    };
    return pc;
}

function switchToStreamingView() {
    apiKeySection.classList.add('hidden');
    streamingSection.classList.remove('hidden');
}
