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
    server.player_assignments.clear()

def test_static_files():
    """Test that the frontend is served."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Mobile Gamepad" in response.text

def test_docs_page():
    """Test that our custom docs.html is served, not the default FastAPI docs."""
    response = client.get("/docs")
    assert response.status_code == 200
    # Check for the custom title in docs.html
    assert "Mobile Gamepad - AsyncAPI Documentation" in response.text

def test_connections_endpoint():
    """Test that the connections endpoint reflects active WebSocket sessions."""
    # Check initial empty state
    response = client.get("/connections")
    assert response.status_code == 200
    assert response.json()["count"] == 0

    # Connect a client
    with client.websocket_connect("/ws") as websocket:
        response = client.get("/connections")
        assert response.json()["count"] == 1
        assert "testclient" in response.json()["clients"][0]["client_id"]

    # Check after disconnect
    response = client.get("/connections")
    assert response.json()["count"] == 0

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
    with patch('server.process_input') as mock_process:
        with client.websocket_connect("/ws") as websocket:
            # Skip info and haptic messages
            websocket.receive_json()
            websocket.receive_json()

            # Send A button press
            websocket.send_json({"t": "b", "i": "A", "s": 1})

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
