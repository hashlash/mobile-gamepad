import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Mock vgamepad before importing server
with patch('vgamepad.VX360Gamepad'), patch('zeroconf.Zeroconf'):
    from server import app

client = TestClient(app)

def test_static_files():
    """Test that the frontend is served."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Mobile Gamepad" in response.text

def test_websocket_connection():
    """Test WebSocket connection and initial info message."""
    # We need to mock the gamepad creation inside the websocket handler
    with patch('server.vg.VX360Gamepad') as mock_vg_class:
        mock_gamepad = MagicMock()
        mock_vg_class.return_value = mock_gamepad

        with client.websocket_connect("/ws") as websocket:
            # Check initial info message
            data = websocket.receive_json()
            assert data["type"] == "info"
            assert "player" in data

            # Check initial haptic feedback
            haptic_data = websocket.receive_json()
            assert haptic_data["type"] == "haptic"

def test_button_input():
    """Test that button inputs are correctly processed and sent to vgamepad."""
    with patch('server.vg.VX360Gamepad') as mock_vg_class:
        mock_gamepad = MagicMock()
        mock_vg_class.return_value = mock_gamepad

        with client.websocket_connect("/ws") as websocket:
            # Skip info and haptic messages
            websocket.receive_json()
            websocket.receive_json()

            # Send A button press
            websocket.send_json({"t": "b", "i": "A", "s": 1})

            # Verify vgamepad was called
            # Note: server.py calls get_gamepad which uses the mock_vg_class
            mock_gamepad.press_button.assert_called()
            mock_gamepad.update.assert_called()

def test_joystick_input():
    """Test that joystick inputs are correctly processed and sent to vgamepad."""
    with patch('server.vg.VX360Gamepad') as mock_vg_class:
        mock_gamepad = MagicMock()
        mock_vg_class.return_value = mock_gamepad

        with client.websocket_connect("/ws") as websocket:
            # Skip info and haptic messages
            websocket.receive_json()
            websocket.receive_json()

            # Send joystick move
            websocket.send_json({"t": "j", "x": 0.5, "y": -0.5})

            # Verify vgamepad was called
            # server.py: gamepad.left_joystick_float(x_value_float=x, y_value_float=-y)
            # Input y=-0.5 -> Output y=0.5
            mock_gamepad.left_joystick_float.assert_called_with(x_value_float=0.5, y_value_float=0.5)
            mock_gamepad.update.assert_called()
