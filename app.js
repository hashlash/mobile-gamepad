/**
 * Mobile Gamepad Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Settings ---
    const state = {
        hapticEnabled: true,
        currentTheme: 'system',
        controlType: 'joystick',
        touchData: {
            joystick: { identifier: null },
            buttons: new Set()
        }
    };

    // --- DOM Elements ---
    const joystickContainer = document.getElementById('joystick-container');
    const dpadContainer = document.getElementById('dpad-container');
    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    const actionButtons = document.querySelectorAll('.action-btn');
    const themeSelect = document.getElementById('theme-select');
    const controlSelect = document.getElementById('control-select');
    const hapticToggle = document.getElementById('haptic-toggle');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const statusIndicator = document.getElementById('status-indicator');

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => {
                statusIndicator.innerText = 'ONLINE';
                statusIndicator.style.color = '#03dac6';
            })
            .catch(() => {
                statusIndicator.innerText = 'OFFLINE';
                statusIndicator.style.color = '#cf6679';
            });
    }

    // --- Haptic Feedback ---
    function triggerHaptic(type = 'light') {
        if (!state.hapticEnabled || !navigator.vibrate) return;

        switch (type) {
            case 'light': navigator.vibrate(20); break;
            case 'medium': navigator.vibrate(50); break;
            case 'heavy': navigator.vibrate([100, 50, 100]); break;
        }
    }

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

    // Load saved settings
    const savedTheme = localStorage.getItem('gamepad-theme') || 'system';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);

    const savedControlType = localStorage.getItem('gamepad-control-type') || 'joystick';
    controlSelect.value = savedControlType;
    applyControlType(savedControlType);

    const savedHaptic = localStorage.getItem('gamepad-haptic') !== 'false';
    hapticToggle.checked = savedHaptic;
    state.hapticEnabled = savedHaptic;

    // Listen for setting changes
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    controlSelect.addEventListener('change', (e) => applyControlType(e.target.value));
    hapticToggle.addEventListener('change', (e) => {
        state.hapticEnabled = e.target.checked;
        localStorage.setItem('gamepad-haptic', e.target.checked);
    });

    // --- Modal Controls ---
    settingsToggle.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // --- Fullscreen Logic ---
    fullscreenToggle.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
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

    // --- D-pad Logic ---
    dpadButtons.forEach(btn => {
        const dir = btn.getAttribute('data-dir');

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            triggerHaptic('light');
            console.log(`D-pad: ${dir} Pressed`);
        });

        const release = (e) => {
            e.preventDefault();
            btn.classList.remove('pressed');
            console.log(`D-pad: ${dir} Released`);
        };

        btn.addEventListener('touchend', release);
        btn.addEventListener('touchcancel', release);
    });

    // --- Action Button Logic ---
    actionButtons.forEach(btn => {
        const btnId = btn.getAttribute('data-btn');

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            triggerHaptic('light');
            console.log(`Button Pressed: ${btnId}`);
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('pressed');
            console.log(`Button Released: ${btnId}`);
        });

        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('pressed');
        });
    });

    // Prevent default gestures (zoom, etc)
    document.addEventListener('gesturestart', (e) => e.preventDefault());
});
