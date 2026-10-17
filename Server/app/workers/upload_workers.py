import aiofiles
import os
from fastapi import UploadFile

from .taskiq import broker

@broker.task
async def upload_file(file_bytes: bytes, filename: str, upload_dir: str, file_name_mid: str):
    os.makedirs(upload_dir,exist_ok=True)

    file_stem, file_ext = os.path.splitext(filename)
    file_name = f"{file_stem}_-_{file_name_mid}{file_ext}"
    file_location = os.path.join(upload_dir, file_name)

    async with aiofiles.open(file_location, "wb") as buffer:
        await buffer.write(file_bytes)