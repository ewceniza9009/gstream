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

    const apiKeySection = document.getElementById('api-key-section');
    const streamingSection = document.getElementById('streaming-section');
    const joinStreamBtn = document.getElementById('join-stream-button');
    const leaveBtn = document.getElementById('leave-button');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusDiv = document.getElementById('status');
    const roomIdInput = document.getElementById('room-id');
    const apiKeyInput = document.getElementById('api-key');

    let signalRConnection;
    let peerConnection;
    let currentRoomId;

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    joinStreamBtn.addEventListener('click', handleJoinStream);
    leaveBtn.addEventListener('click', () => window.location.reload());
     
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
                                                    
                    'X-Api-Key': apiKey
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Could not find broadcast. Check API Key or Room ID.');
            }

            const connectionDetails = await response.json();
            statusDiv.textContent = 'Broadcast found! Connecting...';

            await connectToStream(connectionDetails);

        } catch (error) {
            console.error('Error joining stream:', error);
            statusDiv.textContent = `Error: ${error.message}`;
            streamingSection.classList.add('hidden');
            apiKeySection.classList.remove('hidden');
        }
    }

    async function connectToStream(details) {
        signalRConnection = new signalR.HubConnectionBuilder()
            .withUrl(API_URL + details.signalRHubUrl, {
                                                            
                accessTokenFactory: () => details.token
            })
            .withAutomaticReconnect()
            .build();

                                
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

})();                         


