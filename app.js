/**
 * Mobile Gamepad Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const joystickContainer = document.getElementById('joystick-container');
    const dpadContainer = document.getElementById('dpad-container');
    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    const actionButtons = document.querySelectorAll('.action-btn');
    const themeSelect = document.getElementById('theme-select');
    const controlSelect = document.getElementById('control-select');
    const layoutSelect = document.getElementById('layout-select');
    const hapticToggle = document.getElementById('haptic-toggle');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsList = document.querySelector('.settings-list');
    const statusIndicator = document.getElementById('status-indicator');

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error('SW registration failed:', err));
    }

    // --- Connectivity Status ---
    function updateOnlineStatus() {
        if (navigator.onLine) {
            statusIndicator.innerText = 'ONLINE';
            statusIndicator.style.color = '#03dac6';
        } else {
            statusIndicator.innerText = 'OFFLINE';
            statusIndicator.style.color = '#cf6679';
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // --- State & Settings ---
    const state = {
        hapticEnabled: true,
        currentTheme: 'system',
        controlType: 'joystick',
        buttonLayout: 'xbox',
        touchData: {
            joystick: { identifier: null }
        }
    };

    // --- Theme Management ---
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-retro');
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            document.body.classList.add(`theme-${theme}`);
        }
        state.currentTheme = theme;
        localStorage.setItem('gamepad-theme', theme);
    }

    // --- Control Management ---
    function applyControlType(type) {
        state.controlType = type;
        if (type === 'joystick') {
            joystickContainer.classList.remove('hidden');
            dpadContainer.classList.add('hidden');
        } else {
            joystickContainer.classList.add('hidden');
            dpadContainer.classList.remove('hidden');
        }
        localStorage.setItem('gamepad-control-type', type);
    }

    function applyButtonLayout(layout) {
        state.buttonLayout = layout;
        const container = document.getElementById('action-buttons-area');
        container.classList.remove('layout-xbox', 'layout-ps', 'layout-nintendo', 'layout-cardinal');
        container.classList.add(`layout-${layout}`);

        // Update Button Symbols/Labels
        const btnNorth = document.getElementById('btn-north');
        const btnWest = document.getElementById('btn-west');
        const btnEast = document.getElementById('btn-east');
        const btnSouth = document.getElementById('btn-south');

        const labels = {
            cardinal: { N: 'N', W: 'W', E: 'E', S: 'S' },
            xbox: { N: 'Y', W: 'X', E: 'B', S: 'A' },
            ps: { N: '△', W: '□', E: '○', S: '✕' },
            nintendo: { N: 'X', W: 'Y', E: 'A', S: 'B' }
        };

        const config = labels[layout];
        btnNorth.innerText = config.N;
        btnWest.innerText = config.W;
        btnEast.innerText = config.E;
        btnSouth.innerText = config.S;

        // Update data-btn attributes
        btnNorth.setAttribute('data-btn', config.N);
        btnWest.setAttribute('data-btn', config.W);
        btnEast.setAttribute('data-btn', config.E);
        btnSouth.setAttribute('data-btn', config.S);

        localStorage.setItem('gamepad-button-layout', layout);
    }

    // Load saved settings
    const savedTheme = localStorage.getItem('gamepad-theme') || 'system';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);

    const savedControlType = localStorage.getItem('gamepad-control-type') || 'joystick';
    controlSelect.value = savedControlType;
    applyControlType(savedControlType);

    const savedLayout = localStorage.getItem('gamepad-button-layout') || 'xbox';
    layoutSelect.value = savedLayout;
    applyButtonLayout(savedLayout);

    const savedHaptic = localStorage.getItem('gamepad-haptic') !== 'false';
    hapticToggle.checked = savedHaptic;
    state.hapticEnabled = savedHaptic;

    // Listen for setting changes
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    controlSelect.addEventListener('change', (e) => applyControlType(e.target.value));
    layoutSelect.addEventListener('change', (e) => applyButtonLayout(e.target.value));
    hapticToggle.addEventListener('change', (e) => {
        state.hapticEnabled = e.target.checked;
        localStorage.setItem('gamepad-haptic', e.target.checked);
    });

    // --- Modal Controls ---
    function updateScrollHints() {
        if (!settingsList) return;
        const { scrollTop, scrollHeight, clientHeight } = settingsList;

        // Show top shadow if scrolled down
        if (scrollTop > 5) {
            settingsList.classList.add('scroll-top');
        } else {
            settingsList.classList.remove('scroll-top');
        }

        // Show bottom shadow if there is more to scroll down
        if (scrollTop + clientHeight < scrollHeight - 5) {
            settingsList.classList.add('scroll-bottom');
        } else {
            settingsList.classList.remove('scroll-bottom');
        }
    }

    settingsList.addEventListener('scroll', updateScrollHints);

    settingsToggle.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        // Delay slightly to ensure layout is updated for calculation
        setTimeout(updateScrollHints, 50);
    });
    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // --- Fullscreen Logic ---
    fullscreenToggle.addEventListener('change', () => {
        if (fullscreenToggle.checked) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    fullscreenToggle.checked = false;
                });
            }
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        fullscreenToggle.checked = !!document.fullscreenElement;
    });

    // --- Joystick Logic ---
    function handleJoystick(e) {
        const touches = e.changedTouches;
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxRadius = rect.width / 2;

        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];

            // Check if this touch is on the joystick area
            if (e.type === 'touchstart' && touch.clientX < window.innerWidth / 2) {
                state.touchData.joystick.identifier = touch.identifier;
            }

            if (touch.identifier === state.touchData.joystick.identifier) {
                if (e.type === 'touchend' || e.type === 'touchcancel') {
                    state.touchData.joystick.identifier = null;
                    joystickKnob.style.transform = 'translate(-50%, -50%)';
                    // Emit joystick neutral event
                    console.log('Joystick: neutral');
                    continue;
                }

                // Calculate displacement
                let dx = touch.clientX - centerX;
                let dy = touch.clientY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Constrain to radius
                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }

                // Update UI
                joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                // Emit joystick move event
                const normX = (dx / maxRadius).toFixed(2);
                const normY = (dy / maxRadius).toFixed(2);
                console.log(`Joystick: x=${normX}, y=${normY}`);
            }
        }
    }

    joystickBase.addEventListener('touchstart', (e) => {
        if (state.controlType === 'joystick') handleJoystick(e);
    });
    window.addEventListener('touchmove', (e) => {
        if (state.controlType === 'joystick') handleJoystick(e);
    }, { passive: false });
    window.addEventListener('touchend', (e) => {
        if (state.controlType === 'joystick') handleJoystick(e);
    });
    window.addEventListener('touchcancel', (e) => {
        if (state.controlType === 'joystick') handleJoystick(e);
    });

    // --- Haptic Feedback ---
    function triggerHaptic(type = 'light') {
        if (!state.hapticEnabled || !navigator.vibrate) return;

        switch (type) {
        case 'light': navigator.vibrate(20); break;
        case 'medium': navigator.vibrate(50); break;
        case 'heavy': navigator.vibrate([100, 50, 100]); break;
        }
    }

    // --- Shared Button Logic (D-pad & Action Buttons) ---
    const allButtons = [...dpadButtons, ...actionButtons];

    allButtons.forEach(btn => {
        const getBtnId = () => btn.getAttribute('data-dir') || btn.getAttribute('data-btn');
        const isDpad = btn.classList.contains('dpad-btn');

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            triggerHaptic('light');
            console.log(`${isDpad ? 'D-pad' : 'Button'} Pressed: ${getBtnId()}`);
        });

        const release = (e) => {
            e.preventDefault();
            if (btn.classList.contains('pressed')) {
                btn.classList.remove('pressed');
                console.log(`${isDpad ? 'D-pad' : 'Button'} Released: ${getBtnId()}`);
            }
        };

        btn.addEventListener('touchend', release);
        btn.addEventListener('touchcancel', release);
    });

    // Prevent default gestures (zoom, etc)
    document.addEventListener('gesturestart', (e) => e.preventDefault());
});
