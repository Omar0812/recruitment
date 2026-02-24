import uvicorn
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1)
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app.server:app", host="0.0.0.0", port=8000, reload=False)
