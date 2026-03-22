import pytest
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
    # We use the fact that the server already has its 'gamepads' dict
    # We pre-populate it with our mock to ensure it's used.
    mock_gamepad = MagicMock()
    server.gamepads["test_client"] = mock_gamepad

    # We need to ensure the websocket's client.host:port matches our key
    with client.websocket_connect("/ws") as websocket:
        # FastAPI's TestClient uses 'testclient:50000' usually
        client_id = f"{websocket.scope['client'][0]}:{websocket.scope['client'][1]}"
        server.gamepads[client_id] = mock_gamepad

        # Skip info and haptic messages
        websocket.receive_json()
        websocket.receive_json()

        # Send A button press
        websocket.send_json({"t": "b", "i": "A", "s": 1})

        # Verify the created gamepad had press_button called
        mock_gamepad.press_button.assert_called()
        mock_gamepad.update.assert_called()

def test_joystick_input():
    """Test that joystick inputs are correctly processed and sent to vgamepad."""
    mock_gamepad = MagicMock()

    with client.websocket_connect("/ws") as websocket:
        client_id = f"{websocket.scope['client'][0]}:{websocket.scope['client'][1]}"
        server.gamepads[client_id] = mock_gamepad

        # Skip info and haptic messages
        websocket.receive_json()
        websocket.receive_json()

        # Send joystick move
        websocket.send_json({"t": "j", "x": 0.5, "y": -0.5})

        # Verify vgamepad was called
        # Input y=-0.5 -> Output y=-0.5 (as fixed in the server)
        mock_gamepad.left_joystick_float.assert_called_with(x_value_float=0.5, y_value_float=-0.5)
        mock_gamepad.update.assert_called()
