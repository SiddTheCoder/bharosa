"""Dev entrypoint: python main.py"""
import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run("app.main:asgi_app", host="0.0.0.0", port=settings.PORT, reload=True)
