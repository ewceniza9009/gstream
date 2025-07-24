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

        const apiKeySection = document.getElementById('api-key-section');
        const streamingSection = document.getElementById('streaming-section');
        const joinStreamBtn = document.getElementById('join-stream-button');
        const leaveBtn = document.getElementById('leave-button');
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');
        const roomIdInput = document.getElementById('room-id');
        const apiKeyInput = document.getElementById('api-key');
        const usernameInput = document.getElementById('username');
        const chatSection = document.getElementById('chat-section');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const chatSendButton = document.getElementById('chat-send-button');
        const qualityControls = document.getElementById('quality-controls');
        const viewerCountNumber = document.getElementById('viewer-count-number');
        const reactionButtonsContainer = document.querySelector('.reaction-buttons');
        const videoReactionContainer = document.getElementById('video-reaction-container');
        const pollContainer = document.getElementById('poll-container');

        let signalRConnection;
        let peerConnection;
        let currentRoomId;
        let livekitRoom;
        let broadcastType;
        let myUsername;

        const iceServers = {
            iceServers: [{
                urls: 'stun:stun.l.google.com:19302'
            },
            {
                urls: 'stun:stun1.l.google.com:19302'
            }
            ]
        };

        joinStreamBtn.addEventListener('click', handleJoinStream);
        leaveBtn.addEventListener('click', handleLeave);
        chatSendButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
        reactionButtonsContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                sendReaction(e.target.dataset.emoji);
            }
        });
        pollContainer.addEventListener('click', (e) => {
            const optionBtn = e.target.closest('.poll-option-btn');
            if (optionBtn && !optionBtn.disabled) {
                const pollId = optionBtn.dataset.pollId;
                const optionIndex = parseInt(optionBtn.dataset.optionIndex, 10);
                sendPollVote(pollId, optionIndex);
                pollContainer.querySelectorAll('.poll-option-btn').forEach(btn => btn.disabled = true);
                optionBtn.classList.add('bg-cyan-600', 'hover:bg-cyan-600');
            }

            const header = e.target.closest('.poll-header');
            if (header) {
                const pollElement = header.closest('.poll-display');
                pollElement.classList.toggle('poll-minimized');
                const icon = header.querySelector('.poll-toggle-btn i');
                const isMinimized = pollElement.classList.contains('poll-minimized');
                icon.className = isMinimized ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        });

        async function handleJoinStream() {
            currentRoomId = roomIdInput.value;
            const apiKey = apiKeyInput.value;
            const username = usernameInput.value;
            if (!currentRoomId || !apiKey || !username) {
                alert('Please enter a Display Name, API Key, and Room ID.');
                return;
            }
            switchToStreamingView();
            statusDiv.textContent = `Searching for broadcast in room: ${currentRoomId}...`;
            try {
                const response = await fetch(`${API_URL}/api/broadcast/join/${currentRoomId}`, {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Could not find broadcast.');
                }
                const connectionDetails = await response.json();
                broadcastType = connectionDetails.broadcastType;
                myUsername = connectionDetails.username || username;
                if (broadcastType === 'sfu') {
                    await connectToSfuStream(connectionDetails);
                } else {
                    await connectToMeshStream(connectionDetails);
                }
                await fetchAndRenderChatHistory(currentRoomId);
            } catch (error) {
                console.error('Error joining stream:', error);
                statusDiv.textContent = `Error: ${error.message}`;
                apiKeySection.classList.remove('hidden');
                streamingSection.classList.add('hidden');
            }
        }
        async function handleLeave() {
            if (livekitRoom) await livekitRoom.disconnect();
            if (signalRConnection) await signalRConnection.stop();
            window.location.reload();
        }
        async function connectToSfuStream({ liveKitUrl, token }) {
            statusDiv.textContent = 'SFU broadcast found! Connecting...';
            livekitRoom = new LivekitClient.Room();

            livekitRoom.on(LivekitClient.RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                try {
                    const message = JSON.parse(new TextDecoder().decode(payload));
                    if (topic === 'chat') {
                        displayChatMessage(message.id, message.username, message.content, message.username === myUsername);
                    } else if (topic === 'moderation' && message.action === 'delete') {
                        const msgElement = document.getElementById(`chat-msg-${message.id}`);
                        if (msgElement) msgElement.remove();
                    } else if (topic === 'reaction') {
                        showReaction(message.emoji);
                    } else if (topic === 'poll') {
                        handlePollMessage(message);
                    }
                } catch (e) {
                    console.error("Failed to parse incoming data payload:", e);
                }
            });

            livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication) => {
                if (track.kind === 'video') {
                    const element = track.attach();
                    remoteVideo.srcObject = element.srcObject;
                    setupQualityControls(publication);                     
                } else if (track.kind === 'audio') {
                    const element = track.attach();
                    document.body.appendChild(element);
                }
            });

            livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, () => {
                viewerCountNumber.textContent = livekitRoom.numParticipants;
            });
            livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => {
                viewerCountNumber.textContent = livekitRoom.numParticipants;
            });
            livekitRoom.on(LivekitClient.RoomEvent.Disconnected, () => {
                alert('The broadcast has ended.');
                window.location.reload();
            });
            livekitRoom.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) => {
                if (state === 'connected') {
                    statusDiv.textContent = 'Live stream connected!';
                    viewerCountNumber.textContent = livekitRoom.numParticipants;
                }
            });

            await livekitRoom.connect(liveKitUrl, token);
        }
        async function connectToMeshStream(details) {
            statusDiv.textContent = "Mesh broadcast found! Connecting...";
            signalRConnection = (new signalR.HubConnectionBuilder).withUrl(API_URL + details.signalRHubUrl, {
                accessTokenFactory: () => details.token
            }).withAutomaticReconnect().build();
            signalRConnection.on("ReceiveOfferFromBroadcaster", async (e, t) => {
                peerConnection = createPeerConnection(t), await peerConnection.setRemoteDescription(new RTCSessionDescription(e));
                const n = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(n), await signalRConnection.invoke("SendAnswerToBroadcaster", t, n)
            });
            signalRConnection.on("ReceiveIceCandidate", async e => {
                peerConnection && await peerConnection.addIceCandidate(new RTCIceCandidate(e))
            });
            signalRConnection.on("BroadcastEnded", () => {
                alert("The broadcast has ended."), window.location.reload()
            });
            signalRConnection.on("ReceiveChatMessage", (e, t, n) => {
                displayChatMessage(e, t, n, t === myUsername)
            });
            signalRConnection.on("UpdateViewerCount", e => {
                viewerCountNumber.textContent = e
            });
            signalRConnection.on("MessageDeleted", e => {
                const t = document.getElementById(`chat-msg-${e}`);
                t && t.remove()
            });
            try {
                await signalRConnection.start(), await signalRConnection.invoke("ViewBroadcast", currentRoomId)
            } catch (e) {
                console.error("SignalR Connection Error: ", e), statusDiv.textContent = "Failed to connect to the streaming server."
            }
        }

        function createPeerConnection(broadcasterId) {
            const pc = new RTCPeerConnection(iceServers);
            pc.onicecandidate = e => {
                e.candidate && signalRConnection.invoke("SendIceCandidate", broadcasterId, e.candidate)
            };
            pc.ontrack = e => {
                remoteVideo.srcObject = e.streams[0]
            };
            pc.onconnectionstatechange = () => {
                "connected" === pc.connectionState && (statusDiv.textContent = "Live stream connected!")
            };
            return pc
        }

        function setupQualityControls(publication) {
            qualityControls.innerHTML = '';
            const createButton = (label, quality) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.className = 'px-3 py-1 text-sm rounded-md bg-gray-600 hover:bg-cyan-600 transition-colors';
                btn.onclick = () => {
                    publication.setVideoQuality(quality);
                    Array.from(qualityControls.children).forEach(child => {
                        child.classList.remove('bg-cyan-500');
                    });
                    btn.classList.add('bg-cyan-500');
                };
                return btn;
            };

            if (publication.kind === 'video' && publication.simulcasted) {
                qualityControls.appendChild(createButton('High', LivekitClient.VideoQuality.HIGH));
                qualityControls.appendChild(createButton('Medium', LivekitClient.VideoQuality.MEDIUM));
                qualityControls.appendChild(createButton('Low', LivekitClient.VideoQuality.LOW));
                publication.setVideoQuality(LivekitClient.VideoQuality.HIGH);
                qualityControls.children[0].classList.add('bg-cyan-500');
            }
        }


        async function sendChatMessage() {
            const text = chatInput.value;
            if (!text) return;
            chatInput.value = '';

            if (broadcastType === 'mesh' && signalRConnection) {
                signalRConnection.invoke('SendChatMessage', currentRoomId, text).catch(err => console.error("Chat send error:", err));
                return;
            }

            if (broadcastType === 'sfu' && livekitRoom) {
                try {
                    const apiKey = apiKeyInput.value;
                    if (!apiKey) {
                        console.error("API Key not found, cannot save chat message.");
                        return;
                    }

                    const response = await fetch(`${API_URL}/api/rooms/${currentRoomId}/chat`, {
                        method: 'POST',
                        headers: {
                            'X-Api-Key': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            Content: text
                        })
                    });
                    if (!response.ok) throw new Error('Failed to save message via API');

                    const savedMessageDto = await response.json();

                    const data = new TextEncoder().encode(JSON.stringify(savedMessageDto));
                    livekitRoom.localParticipant.publishData(data, {
                        reliable: true,
                        topic: 'chat'
                    });

                    displayChatMessage(savedMessageDto.id, savedMessageDto.username, savedMessageDto.content, true);
                } catch (error) {
                    console.error("Failed to send chat message:", error);
                    chatInput.value = text;
                }
            }
        }
        async function fetchAndRenderChatHistory(roomId) {
            const apiKey = apiKeyInput.value;
            if (!apiKey) {
                console.error("API Key not found, cannot fetch chat history.");
                return;
            }
            chatMessages.innerHTML = '';
            try {
                const response = await fetch(`${API_URL}/api/rooms/${roomId}/chat`, {
                    headers: {
                        'X-Api-Key': apiKey
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch chat history with status: ${response.status}`);
                }
                const history = await response.json();
                history.forEach(msg => displayChatMessage(msg.id, msg.username, msg.content, msg.username === myUsername));
            } catch (e) {
                console.error("Could not fetch chat history", e);
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
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble flex flex-col w-full max-w-xs p-2.5 rounded-lg' + (isSelf ? ' rounded-br-none bg-blue-700' : ' rounded-bl-none bg-gray-600');
            bubble.innerHTML = `<p class="text-sm font-normal text-white break-words">${message}</p>`;

            header.appendChild(usernameSpan);
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

        function sendReaction(emoji) {
            showReaction(emoji);

            if (!livekitRoom) return;
            const payload = {
                type: 'reaction',
                emoji: emoji
            };
            const data = new TextEncoder().encode(JSON.stringify(payload));
            livekitRoom.localParticipant.publishData(data, {
                reliable: false,
                topic: 'reaction'
            });
        }

        function showReaction(emoji) {
            const reaction = document.createElement('span');
            reaction.className = 'reaction-emoji';
            reaction.textContent = emoji;
            reaction.style.setProperty('--lx', `${Math.random() * 80 + 10}%`);
            reaction.style.setProperty('--tx', `${(Math.random() * 100) - 50}px`);
            reaction.style.setProperty('--rot', `${(Math.random() * 40) - 20}deg`);
            videoReactionContainer.appendChild(reaction);
            setTimeout(() => reaction.remove(), 4000);
        }

        function handlePollMessage(message) {
            if (message.type === 'poll_start') {
                displayPoll(message.poll);
            } else if (message.type === 'poll_update') {
                updatePollResults(message.results);
            }
        }

        function displayPoll(poll) {
            let optionsHtml = poll.options.map(option => `<button data-poll-id="${poll.id}" data-option-index="${option.index}" class="poll-option-btn w-full text-left bg-gray-600 hover:bg-gray-500 p-3 rounded-md">${option.text}</button>`).join('');

            pollContainer.innerHTML = `
        <div class="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg shadow-lg poll-display" id="poll-${poll.id}">
            <div class="poll-header">
                <p class="font-bold text-white mb-0 poll-question-text">${poll.question}</p>
                <button class="poll-toggle-btn"><i class="fas fa-chevron-up"></i></button>
            </div>
            <div class="poll-body mt-3">
                <div class="space-y-2 poll-options">
                    ${optionsHtml}
                </div>
            </div>
        </div>
    `;
        }


        function sendPollVote(pollId, optionIndex) {
            const payload = {
                type: 'poll_vote',
                pollId,
                optionIndex
            };
            const data = new TextEncoder().encode(JSON.stringify(payload));
            livekitRoom.localParticipant.publishData(data, {
                reliable: true,
                topic: 'poll'
            });
        }

        function updatePollResults(results) {
            const totalVotes = results.reduce((sum, opt) => sum + opt.votes, 0);
            if (totalVotes === 0) return;

            let resultsHtml = results.map(option => {
                const percentage = ((option.votes / totalVotes) * 100).toFixed(1);
                return `<div class="mb-2"><div class="flex justify-between items-center mb-1"><span class="text-sm font-medium text-gray-300">${option.text}</span><span class="text-sm font-bold text-white">${percentage}%</span></div><div class="w-full bg-gray-600 rounded-full h-2"><div class="bg-cyan-500 h-2 rounded-full poll-progress-bar" style="width: ${percentage}%"></div></div></div>`;
            }).join('');

            const pollOptionsDiv = pollContainer.querySelector('.poll-options');
            if (pollOptionsDiv) {
                pollOptionsDiv.innerHTML = resultsHtml;
            }
        }

        function switchToStreamingView() {
            apiKeySection.classList.add('hidden');
            streamingSection.classList.remove('hidden');
            chatSection.classList.remove('hidden');
        }
    })();
});