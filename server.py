import asyncio
import json
import socket
import vgamepad as vg
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from zeroconf import IPVersion, ServiceInfo, Zeroconf

app = FastAPI()

# --- Virtual Gamepad Management ---
# A dictionary to map client IDs to their virtual gamepad instances
gamepads = {}

def get_gamepad(client_id):
    if client_id not in gamepads:
        try:
            # We default to Xbox 360 controller
            gamepads[client_id] = vg.VX360Gamepad()
            print(f"Created virtual Xbox 360 controller for client: {client_id}")
        except Exception as e:
            print(f"Error creating virtual gamepad: {e}")
            return None
    return gamepads[client_id]

# Mapping for common button IDs to vgamepad enums
BUTTON_MAP = {
    'A': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
    'B': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
    'X': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
    'Y': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
    '△': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
    '□': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
    '○': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
    '✕': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
    'UP': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
    'DOWN': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
    'LEFT': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
    'RIGHT': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT,
}

def process_input(client_id, data):
    print(f"Processing input from {client_id}: {data}")
    gamepad = get_gamepad(client_id)
    if not gamepad:
        return

    msg_type = data.get('t')

    if msg_type == 'b':  # Button
        btn_id = data.get('i')
        state = data.get('s')
        vg_btn = BUTTON_MAP.get(btn_id)
        if vg_btn:
            if state == 1:
                gamepad.press_button(button=vg_btn)
            else:
                gamepad.release_button(button=vg_btn)
            gamepad.update()

    elif msg_type == 'j':  # Joystick
        x = float(data.get('x', 0))
        y = float(data.get('y', 0))
        # vgamepad expects y-axis to be inverted compared to typical screen coords
        # but our frontend already sends standard joystick coords.
        # vgamepad uses -1.0 to 1.0 for floats.
        gamepad.left_joystick_float(x_value_float=x, y_value_float=-y)
        gamepad.update()

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = f"{websocket.client.host}:{websocket.client.port}"
    print(f"Client connected: {client_id}")

    # Assign Player Number based on current connections
    player_id = len(gamepads) + 1
    await websocket.send_json({"type": "info", "player": player_id})
    # Send a small haptic pulse to confirm connection
    await websocket.send_json({"type": "haptic", "effect": "medium"})

    try:
        while True:
            data = await websocket.receive_json()
            process_input(client_id, data)
    except WebSocketDisconnect:
        print(f"Client disconnected: {client_id}")
        if client_id in gamepads:
            del gamepads[client_id]

# --- ZeroConf / mDNS Discovery ---
def start_zeroconf():
    desc = {'path': '/'}
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname + ".local")
    except:
        # Fallback to finding local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('8.8.8.8', 1))
            local_ip = s.getsockname()[0]
        except:
            local_ip = '127.0.0.1'
        finally:
            s.close()

    info = ServiceInfo(
        "_http._tcp.local.",
        "Mobile Gamepad._http._tcp.local.",
        addresses=[socket.inet_aton(local_ip)],
        port=8000,
        properties=desc,
        server=f"{hostname}.local.",
    )

    zeroconf = Zeroconf(ip_version=IPVersion.V4Only)
    print(f"Starting mDNS advertising as {hostname}.local")
    zeroconf.register_service(info)
    return zeroconf, info

# --- Startup/Shutdown ---
# Disabled Zeroconf for this environment to avoid startup hangs
# @app.on_event("startup")
# async def startup_event():
#     try:
#         app.state.zeroconf, app.state.zc_info = start_zeroconf()
#     except Exception as e:
#         print(f"Warning: Zeroconf startup failed: {e}")
#         app.state.zeroconf = None

# @app.on_event("shutdown")
# def shutdown_event():
#     if hasattr(app.state, 'zeroconf') and app.state.zeroconf:
#         app.state.zeroconf.unregister_service(app.state.zc_info)
#         app.state.zeroconf.close()

# --- Serve Frontend ---
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
