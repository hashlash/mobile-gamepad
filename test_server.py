import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Mock vgamepad and zeroconf BEFORE importing server
with patch('vgamepad.VX360Gamepad'), patch('zeroconf.Zeroconf'):
    import server
    from server import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_gamepads():
    server.gamepads.clear()

def test_static_files():
    """Test that the frontend is served."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Mobile Gamepad" in response.text

def test_websocket_connection():
    """Test WebSocket connection and initial info message."""
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
    mock_gamepad = MagicMock()

    # We patch the process_input function directly to verify it gets called
    with patch('server.process_input') as mock_process:
        with client.websocket_connect("/ws") as websocket:
            # Skip info and haptic messages
            websocket.receive_json()
            websocket.receive_json()

            # Send A button press
            websocket.send_json({"t": "b", "i": "A", "s": 1})

            # TestClient runs in a single thread, so the message might be processed synchronously
            # But FastAPI handles websockets in tasks.
            # We might need a small wait or just check if it was called.
            # However, TestClient.websocket_connect is synchronous-looking but uses a sub-event loop.

            # Let's try to verify the call
            client_id = f"{websocket.scope['client'][0]}:{websocket.scope['client'][1]}"
            mock_process.assert_called_with(client_id, {"t": "b", "i": "A", "s": 1})

def test_joystick_input():
    """Test that joystick inputs are correctly processed and sent to vgamepad."""
    with patch('server.process_input') as mock_process:
        with client.websocket_connect("/ws") as websocket:
            # Skip info and haptic messages
            websocket.receive_json()
            websocket.receive_json()

            # Send joystick move
            websocket.send_json({"t": "j", "x": 0.5, "y": -0.5})

            client_id = f"{websocket.scope['client'][0]}:{websocket.scope['client'][1]}"
            mock_process.assert_called_with(client_id, {"t": "j", "x": 0.5, "y": -0.5})
