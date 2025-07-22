(async function () {
    let API_URL;
    let jwtToken;

    // --- DOM Elements ---
    const changePasswordForm = document.getElementById('change-password-form');
    const oldPasswordInput = document.getElementById('old-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessage = document.getElementById('password-message');

    const apiKeyDisplay = document.getElementById('api-key-display');
    const regenerateKeyBtn = document.getElementById('regenerate-key-btn');
    const copyKeyBtn = document.getElementById('copy-key-btn');
    const keyMessage = document.getElementById('key-message');


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
            window.location.href = '/broadcast.html'; // Redirect if not logged in
            return;
        }

        changePasswordForm.addEventListener('submit', handleChangePassword);
        regenerateKeyBtn.addEventListener('click', handleRegenerateKey);
        copyKeyBtn.addEventListener('click', handleCopyKey);

        await fetchApiKey();
    }

    async function apiFetch(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch(`${API_URL}${endpoint}`, { ...defaultOptions, ...options });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'An API error occurred.');
        }
        return data;
    }

    async function fetchApiKey() {
        try {
            const data = await apiFetch('/api/user/apikey');
            apiKeyDisplay.textContent = data.apiKey;
        } catch (error) {
            apiKeyDisplay.textContent = "Could not load API Key.";
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        passwordMessage.textContent = '';
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;

        if (newPassword !== confirmNewPasswordInput.value) {
            passwordMessage.textContent = "New passwords do not match.";
            passwordMessage.className = "mt-4 text-center h-5 text-red-400";
            return;
        }

        try {
            const data = await apiFetch('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ oldPassword, newPassword })
            });
            passwordMessage.textContent = data.message;
            passwordMessage.className = "mt-4 text-center h-5 text-green-400";
            changePasswordForm.reset();
        } catch (error) {
            passwordMessage.textContent = error.message;
            passwordMessage.className = "mt-4 text-center h-5 text-red-400";
        }
    }

    async function handleRegenerateKey() {
        if (!confirm('Are you sure you want to regenerate your API key? Your old key will stop working immediately.')) {
            return;
        }
        try {
            const data = await apiFetch('/api/user/regenerate-apikey', { method: 'POST' });
            apiKeyDisplay.textContent = data.apiKey;
            keyMessage.textContent = 'API Key regenerated successfully!';
            setTimeout(() => keyMessage.textContent = '', 3000);
        } catch (error) {
            keyMessage.textContent = error.message;
        }
    }

    function handleCopyKey() {
        navigator.clipboard.writeText(apiKeyDisplay.textContent).then(() => {
            keyMessage.textContent = 'Copied to clipboard!';
            setTimeout(() => keyMessage.textContent = '', 2000);
        });
    }


    initialize();
})();