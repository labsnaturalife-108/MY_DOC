import os
from pathlib import Path
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from backend.main import app

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "dist_web"

if WEB_DIR.exists():
    next_dir = WEB_DIR / "_next"
    if next_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="next_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if (
            full_path.startswith("api/")
            or full_path == "api"
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
            or full_path.startswith("redoc")
        ):
            raise HTTPException(status_code=404, detail="API route not found")

        req_path = WEB_DIR / full_path
        if req_path.is_file():
            return FileResponse(req_path)

        if req_path.is_dir() and (req_path / "index.html").is_file():
            return FileResponse(req_path / "index.html")

        root_index = WEB_DIR / "index.html"
        if root_index.is_file():
            return FileResponse(root_index)

        raise HTTPException(status_code=404, detail="Frontend build not found")


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "7860"))
    print(f"Starting MY_DOC Cloud Server on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
