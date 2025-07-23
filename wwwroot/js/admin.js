(async function () {
    let API_URL;
    let jwtToken;
    let allRooms = [];
    let allUsers = [];

    const logoutButton = document.getElementById('logout-button');
    const flushBroadcastsBtn = document.getElementById('flush-broadcasts-button');
    const roomListContainer = document.getElementById('room-list-container');
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomSearchInput = document.getElementById('room-search-input');
    const roomModal = document.getElementById('room-modal');
    const roomModalTitle = document.getElementById('room-modal-title');
    const roomModalForm = document.getElementById('room-modal-form');
    const roomNameInputModal = document.getElementById('room-name-modal');
    const roomIdInputModal = document.getElementById('room-id-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const userListContainer = document.getElementById('user-list-container');
    const userSearchInput = document.getElementById('user-search-input');
    const userModal = document.getElementById('user-modal');
    const userModalTitle = document.getElementById('user-modal-title');
    const userModalForm = document.getElementById('user-modal-form');
    const userIdInputModal = document.getElementById('user-id-modal');
    const userNameModal = document.getElementById('user-name-modal');
    const userRoleModal = document.getElementById('user-role-modal');
    const userBlockedModal = document.getElementById('user-blocked-modal');
    const closeUserModalBtn = document.getElementById('close-user-modal-btn');

    const activeStreamsStat = document.getElementById('active-streams-stat');
    const totalViewersStat = document.getElementById('total-viewers-stat');
    const popularRoomsList = document.getElementById('popular-rooms-list');


    async function initialize() {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) throw new Error('Could not fetch server configuration.');
            const config = await response.json();
            API_URL = config.apiUrl;
        } catch (error) {
            document.body.innerHTML = '<h1>Error: Could not connect to the server.</h1>';
            return;
        }

        jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            window.location.href = '/broadcast.html';
            return;
        }

        const decodedToken = JSON.parse(atob(jwtToken.split('.')[1]));
        const userRole = decodedToken.role;

        if (userRole !== 'Admin') {
            alert('Access Denied: This page is for administrators only.');
            window.location.href = '/broadcast.html';
            return;
        }

        logoutButton.addEventListener('click', handleLogout);
        flushBroadcastsBtn.addEventListener('click', handleFlushBroadcasts);
        createRoomBtn.addEventListener('click', () => openRoomModal());
        closeModalBtn.addEventListener('click', closeRoomModal);
        roomModalForm.addEventListener('submit', handleSaveRoom);
        closeUserModalBtn.addEventListener('click', closeUserModal);
        userModalForm.addEventListener('submit', handleSaveUser);
        roomSearchInput.addEventListener('input', handleRoomSearch);
        userSearchInput.addEventListener('input', handleUserSearch);


        await Promise.all([
            fetchAndRenderRooms(),
            fetchAndRenderUsers(),
            fetchAndRenderStats()
        ]);

        setInterval(fetchAndRenderStats, 5000);                     
    }

    function handleLogout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('myUsername');
        window.location.href = '/index.html';
    }

    async function fetchAndRenderStats() {
        try {
            const stats = await apiFetch('/api/admin/stats');
            activeStreamsStat.textContent = stats.totalActiveStreams;
            totalViewersStat.textContent = stats.totalViewers;

            popularRoomsList.innerHTML = '';
            if (stats.popularRooms.length > 0) {
                stats.popularRooms.forEach(room => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center';
                    li.innerHTML = `
                        <span><i class="fas fa-video mr-2"></i>${room.roomName}</span>
                        <span class="font-bold text-green-400">${room.viewers} viewers</span>
                    `;
                    popularRoomsList.appendChild(li);
                });
            } else {
                popularRoomsList.innerHTML = '<li class="text-gray-500">No active streams.</li>';
            }
        } catch (error) {
            console.error("Could not fetch stats:", error.message);
        }
    }


    async function apiFetch(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        };
        const response = await fetch(`${API_URL}${endpoint}`, { ...defaultOptions, ...options });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'An API error occurred.');
        }
        return response.status === 204 ? null : response.json();
    }

    async function fetchAndRenderRooms() {
        roomListContainer.innerHTML = `<p class="text-gray-400">Loading rooms...</p>`;
        try {
            const rooms = await apiFetch('/api/rooms');
            allRooms = rooms;
            renderRoomList(allRooms);
        } catch (error) {
            roomListContainer.innerHTML = `<p class="text-red-400">Could not load rooms: ${error.message}</p>`;
        }
    }

    function handleRoomSearch(e) {
        const query = e.target.value.toLowerCase();
        const filteredRooms = allRooms.filter(room =>
            room.name.toLowerCase().includes(query) ||
            (room.broadcasterUsername && room.broadcasterUsername.toLowerCase().includes(query))
        );
        renderRoomList(filteredRooms);
    }
    function renderRoomList(rooms) {
        roomListContainer.innerHTML = '';
        if (rooms.length === 0) {
            roomListContainer.innerHTML = '<p class="text-gray-400">No rooms found.</p>';
            return;
        }
        rooms.forEach(room => {
            const statusColors = { 'Broadcasting': 'bg-green-500', 'Open': 'bg-blue-500', 'Ended': 'bg-gray-500' };
            const card = document.createElement('div');
            card.className = 'bg-gray-700 rounded-lg p-4 mb-3';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-lg font-bold text-white break-all">${room.name}</h4>
                        <p class="text-sm text-gray-400">${room.broadcasterUsername ? `By: ${room.broadcasterUsername}` : 'No broadcaster'}</p>
                    </div>
                    <span class="text-xs font-semibold py-1 px-2 rounded-full ${statusColors[room.status] || 'bg-yellow-500'}">${room.status}</span>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    ${room.status === 'Broadcasting' ? `<button data-room-name="${room.name}" class="end-broadcast-btn bg-orange-600 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded text-sm">End Broadcast</button>` : ''}
                    <button data-room-id="${room.id}" data-room-name="${room.name}" class="edit-room-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-pencil-alt"></i></button>
                    <button data-room-id="${room.id}" class="delete-room-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            roomListContainer.appendChild(card);
        });

        document.querySelectorAll('.edit-room-btn').forEach(btn => btn.addEventListener('click', (e) => openRoomModal(e.currentTarget.dataset.roomId, e.currentTarget.dataset.roomName)));
        document.querySelectorAll('.delete-room-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteRoom(e.currentTarget.dataset.roomId)));
        document.querySelectorAll('.end-broadcast-btn').forEach(btn => btn.addEventListener('click', (e) => handleEndBroadcast(e.currentTarget.dataset.roomName)));
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
        const url = id ? `/api/rooms/${id}` : `/api/rooms`;
        const method = id ? 'PUT' : 'POST';
        try {
            await apiFetch(url, { method, body: JSON.stringify({ name }) });
            closeRoomModal();
            await fetchAndRenderRooms();
        } catch (error) { alert(`Save failed: ${error.message}`); }
    }

    async function handleDeleteRoom(id) {
        if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;
        try {
            await apiFetch(`/api/rooms/${id}`, { method: 'DELETE' });
            await fetchAndRenderRooms();
        } catch (error) { alert(`Delete failed: ${error.message}`); }
    }

    async function fetchAndRenderUsers() {
        userListContainer.innerHTML = `<p class="text-gray-400">Loading users...</p>`;
        try {
            const users = await apiFetch('/api/admin/users');
            allUsers = users;
            renderUserList(allUsers);
        } catch (error) {
            userListContainer.innerHTML = `<p class="text-red-400">Could not load users: ${error.message}</p>`;
        }
    }

    function handleUserSearch(e) {
        const query = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user =>
            user.username.toLowerCase().includes(query)
        );
        renderUserList(filteredUsers);
    }

    function renderUserList(users) {
        userListContainer.innerHTML = '';
        users.forEach(user => {
            const roleColors = { 'Admin': 'text-red-400', 'Broadcaster': 'text-cyan-400', 'Consumer': 'text-gray-400' };
            const card = document.createElement('div');
            card.className = 'bg-gray-700 rounded-lg p-4 mb-3';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-lg font-bold text-white">${user.username} ${user.isBlocked ? '<span class="text-xs text-red-500">(Blocked)</span>' : ''}</h4>
                        <p class="text-sm ${roleColors[user.role] || 'text-gray-500'}">${user.role}</p>
                        <p class="text-xs text-gray-500 mt-1">API Key: ${user.userApiKey}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                         <button data-user-id="${user.id}" data-username="${user.username}" data-role="${user.role}" data-is-blocked="${user.isBlocked}" class="edit-user-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-user-edit"></i></button>
                         <button data-user-id="${user.id}" class="delete-user-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"><i class="fas fa-user-times"></i></button>
                    </div>
                </div>`;
            userListContainer.appendChild(card);
        });

        document.querySelectorAll('.edit-user-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const { userId, username, role, isBlocked } = e.currentTarget.dataset;
            openUserModal(userId, username, role, isBlocked === 'true');
        }));
        document.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteUser(e.currentTarget.dataset.userId)));
    }

    function openUserModal(id, name, role, isBlocked) {
        userModalForm.reset();
        userIdInputModal.value = id;
        userNameModal.textContent = name;
        userRoleModal.value = role;
        userBlockedModal.checked = isBlocked;
        userModal.classList.remove('hidden');
        userModal.classList.add('flex');
    }

    function closeUserModal() {
        userModal.classList.add('hidden');
        userModal.classList.remove('flex');
    }

    async function handleSaveUser(e) {
        e.preventDefault();
        const id = userIdInputModal.value;
        const user = {
            role: userRoleModal.value,
            isBlocked: userBlockedModal.checked
        };
        try {
            await apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(user) });
            closeUserModal();
            await fetchAndRenderUsers();
        } catch (error) { alert(`Save failed: ${error.message}`); }
    }

    async function handleDeleteUser(id) {
        if (!confirm('Are you sure you want to delete this user? This is permanent.')) return;
        try {
            await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            await fetchAndRenderUsers();
        } catch (error) { alert(`Delete failed: ${error.message}`); }
    }

    async function handleFlushBroadcasts() {
        if (!confirm("Are you sure you want to end ALL active broadcasts? This will disconnect everyone immediately.")) return;
        try {
            const result = await apiFetch(`/api/admin/broadcasts/flush`, { method: 'POST' });
            alert(result.message || 'Successfully flushed all broadcasts.');
            await fetchAndRenderRooms();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async function handleEndBroadcast(roomName) {
        if (!confirm(`Are you sure you want to force-end the broadcast in room "${roomName}"?`)) return;
        try {
            const result = await apiFetch(`/api/admin/broadcasts/end/${roomName}`, { method: 'POST' });
            alert(result.message || `Successfully ended broadcast in ${roomName}.`);
            await fetchAndRenderRooms();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    initialize();
})();