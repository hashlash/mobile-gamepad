# Mobile Gamepad

This is a project for using mobile phones as simple game controllers for multiplayer games on Linux. The idea is that a Linux machine hosts a web page that players can open on their phones over the local network, and each connected phone acts as its own controller.

The project focuses on local Wi-Fi play and a lightweight web-based experience, with an emphasis on keeping the interface simple and easy to access.

## Features

- **Progressive Web App (PWA):** Fully installable on iOS and Android for a native app-like experience.
- **Offline Support:** Works without an active internet connection after initial load thanks to Service Workers.
- **Dual Control Schemes:** Switch between a smooth virtual thumbstick (Joystick) and a classic prismatic D-pad.
- **Configurable Layouts:** Support for Xbox, PlayStation, Nintendo, and Cardinal action button mappings.
- **Multiple Themes:** Light, Dark, and Retro themes that persist across sessions.
- **Haptic Feedback:** Physical vibration on button presses and joystick interactions.
- **Landscape Optimized:** Forced orientation guidance to ensure the best gaming experience.

## Getting Started

To use the gamepad, you need to serve the project files from a web server on your local network.

### Local Development Server

If you have Python installed, you can quickly start a server in the project directory:

```bash
python3 -m http.server 8000
```

Then, open your mobile browser and navigate to your computer's IP address (e.g., `http://192.168.1.5:8000`).

## Development

The project uses modern web standards and includes professional tooling for quality assurance.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### Installation

```bash
npm install
```

### Linting

We use ESLint to maintain code consistency.

```bash
npm run lint
```

### Testing

End-to-End tests are implemented using Playwright.

```bash
npx playwright install # Install required browsers
npm test
```

## Technology Stack

- **Vanilla JS/HTML/CSS:** Zero framework overhead for maximum performance.
- **CSS Variables:** For dynamic and performant theming.
- **Service Workers:** For asset caching and PWA functionality.
- **Vibration API:** For tactile feedback.
- **Fullscreen API:** For an immersive experience.
